from __future__ import annotations

import os
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from flask import Blueprint, jsonify, request, session
from sqlalchemy import func, or_, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.security import check_password_hash, generate_password_hash

from . import db
from .models import InventoryMovement, Product, Sale, SaleItem, User

api_bp = Blueprint("api", __name__)

LOCAL_USERS = {
    "admin@northstar.market": {
        "id": 1,
        "name": "Maya Chen",
        "email": "admin@northstar.market",
        "role": "admin",
        "password_hash": "scrypt:32768:8:1$hThna1lyBaC3RVUi$26eb4a66b7e4ab8fe42d284f4bb9b746855fb786d860ce911134692fac933bfc5ed23cc0e75412bbcd1512addcf7b2774932b22ee2fafc40ce69ffb1520c9e82",
    },
    "staff@northstar.market": {
        "id": 2,
        "name": "Alex Rivera",
        "email": "staff@northstar.market",
        "role": "staff",
        "password_hash": "scrypt:32768:8:1$gr26MxOqhHxTIUyQ$b5a8d436c2bd35ad5b27b887c2d657096d0d62aae9ed3007690723e22e5018392c2421cfc0a85d8eac1754f64abe7945ba3ba457567fbd0e2213249998d74fab",
    },
}
LOCAL_STAFF_USERS: dict[str, dict] = {}


def json_error(message: str, status: int = 400):
    return jsonify({"error": message}), status


def money(value: object) -> Decimal:
    try:
        return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except Exception as exc:
        raise ValueError("Expected a valid monetary amount") from exc


def current_user() -> User | None:
    user_id = session.get("user_id")
    return db.session.get(User, user_id) if user_id else None


@api_bp.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"status": "ok", "database": "connected"})
    except SQLAlchemyError:
        return jsonify({"status": "degraded", "database": "unavailable"}), 503


@api_bp.get("/health/live")
def liveness():
    return jsonify({"status": "ok", "service": "posflow-api"})


@api_bp.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "")).strip().lower()
    if not email or not password or role not in {"admin", "staff"}:
        return json_error("Email, password, and a valid role are required")

    try:
        user = db.session.scalar(db.select(User).where(User.email == email, User.is_active.is_(True)))
    except SQLAlchemyError:
        db.session.rollback()
        user = None
    local_user = LOCAL_USERS.get(email) or LOCAL_STAFF_USERS.get(email)
    valid_database_user = user and user.role == role and check_password_hash(user.password_hash, password)
    valid_local_user = local_user and local_user["role"] == role and check_password_hash(local_user["password_hash"], password)
    if not valid_database_user and not valid_local_user:
        return json_error("Invalid email, password, or role", 401)
    if valid_database_user:
        session["user_id"] = user.id
        session.pop("demo_user", None)
        result = {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    else:
        session["demo_user"] = {key: local_user[key] for key in ("id", "name", "email", "role")}
        result = session["demo_user"]
    return jsonify({"user": result, "mode": "live" if valid_database_user else "demo"})


@api_bp.post("/auth/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@api_bp.get("/auth/me")
def me():
    user = current_user()
    if user:
        return jsonify({"user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}, "mode": "live"})
    if session.get("demo_user"):
        return jsonify({"user": session["demo_user"], "mode": "demo"})
    return json_error("Not authenticated", 401)


def session_role() -> str | None:
    user = current_user()
    if user:
        return user.role
    return (session.get("demo_user") or {}).get("role")


@api_bp.get("/staff")
def list_staff():
    if session_role() != "admin":
        return json_error("Admin access required", 403)
    try:
        users = db.session.scalars(db.select(User).where(User.role == "staff").order_by(User.name.asc())).all()
        return jsonify({"staff": [{"id": user.id, "name": user.name, "email": user.email, "role": user.role} for user in users], "mode": "live"})
    except SQLAlchemyError:
        return jsonify({"staff": [{key: value for key, value in user.items() if key != "password_hash"} for user in LOCAL_STAFF_USERS.values()], "mode": "demo"})


@api_bp.post("/staff")
def create_staff():
    if session_role() != "admin":
        return json_error("Admin access required", 403)
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    if not name or not email or len(password) < 6:
        return json_error("Name, email, and a password of at least 6 characters are required")
    password_hash = generate_password_hash(password)
    try:
        user = User(name=name, email=email, role="staff", password_hash=password_hash)
        db.session.add(user)
        db.session.commit()
        return jsonify({"staff": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}, "mode": "live"}), 201
    except IntegrityError:
        db.session.rollback()
        return json_error("A user with that email already exists", 409)
    except SQLAlchemyError:
        db.session.rollback()
        user = {"id": 1000 + len(LOCAL_STAFF_USERS), "name": name, "email": email, "role": "staff", "password_hash": password_hash}
        LOCAL_STAFF_USERS[email] = user
        return jsonify({"staff": {key: value for key, value in user.items() if key != "password_hash"}, "mode": "demo"}), 201


@api_bp.get("/dashboard")
def dashboard():
    try:
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        sales_today = db.session.scalar(
            db.select(func.coalesce(func.sum(Sale.total), 0)).where(Sale.created_at >= today_start)
        )
        orders_today = db.session.scalar(
            db.select(func.count(Sale.id)).where(Sale.created_at >= today_start)
        )
        low_stock = db.session.scalars(
            db.select(Product).where(
                Product.is_archived.is_(False), Product.stock_quantity <= Product.reorder_level
            ).order_by(Product.stock_quantity.asc()).limit(5)
        ).all()
        recent = db.session.scalars(db.select(Sale).order_by(Sale.created_at.desc()).limit(5)).all()
        return jsonify(
            {
                "sales_today": float(sales_today or 0),
                "orders_today": orders_today or 0,
                "low_stock": [product.as_dict() for product in low_stock],
                "recent_sales": [sale.as_dict() for sale in recent],
            }
        )
    except SQLAlchemyError:
        return json_error("Dashboard data is temporarily unavailable", 503)


@api_bp.get("/products")
def list_products():
    query = str(request.args.get("query", "")).strip()
    category = str(request.args.get("category", "")).strip()
    status = str(request.args.get("status", "")).strip()
    statement = db.select(Product).order_by(Product.name.asc())
    if query:
        pattern = f"%{query}%"
        statement = statement.where(or_(Product.name.ilike(pattern), Product.sku.ilike(pattern)))
    if category:
        statement = statement.where(Product.category == category)
    if status == "archived":
        statement = statement.where(Product.is_archived.is_(True))
    elif status == "low":
        statement = statement.where(Product.is_archived.is_(False), Product.stock_quantity <= Product.reorder_level)
    else:
        statement = statement.where(Product.is_archived.is_(False))
    products = db.session.scalars(statement).all()
    return jsonify({"products": [product.as_dict() for product in products]})


@api_bp.post("/products")
def create_product():
    payload = request.get_json(silent=True) or {}
    required = ["sku", "name", "category", "price"]
    missing = [field for field in required if not str(payload.get(field, "")).strip()]
    if missing:
        return json_error(f"Missing fields: {', '.join(missing)}")
    try:
        product = Product(
            sku=str(payload["sku"]).strip().upper(),
            name=str(payload["name"]).strip(),
            category=str(payload["category"]).strip(),
            description=str(payload.get("description", "")).strip(),
            price=money(payload["price"]),
            cost=money(payload.get("cost", 0)),
            stock_quantity=int(payload.get("stock_quantity", 0)),
            reorder_level=int(payload.get("reorder_level", 5)),
        )
        db.session.add(product)
        db.session.commit()
        return jsonify({"product": product.as_dict()}), 201
    except (ValueError, TypeError) as exc:
        db.session.rollback()
        return json_error(str(exc))
    except IntegrityError:
        db.session.rollback()
        return json_error("SKU already exists")


@api_bp.patch("/products/<int:product_id>")
def update_product(product_id: int):
    product = db.session.get(Product, product_id)
    if not product:
        return json_error("Product not found", 404)
    payload = request.get_json(silent=True) or {}
    try:
        for field in ("name", "category", "description"):
            if field in payload:
                setattr(product, field, str(payload[field]).strip())
        for field in ("price", "cost"):
            if field in payload:
                setattr(product, field, money(payload[field]))
        for field in ("stock_quantity", "reorder_level"):
            if field in payload:
                setattr(product, field, int(payload[field]))
        if "is_archived" in payload:
            product.is_archived = bool(payload["is_archived"])
        db.session.commit()
        return jsonify({"product": product.as_dict()})
    except (ValueError, TypeError) as exc:
        db.session.rollback()
        return json_error(str(exc))


@api_bp.post("/inventory/adjustments")
def create_inventory_adjustment():
    payload = request.get_json(silent=True) or {}
    try:
        product = db.session.get(Product, int(payload.get("product_id")))
        delta = int(payload.get("quantity_delta"))
        if not product:
            return json_error("Product not found", 404)
        if product.stock_quantity + delta < 0:
            return json_error("Adjustment would make stock negative")
        product.stock_quantity += delta
        movement = InventoryMovement(
            product=product,
            user=current_user(),
            quantity_delta=delta,
            reason=str(payload.get("reason", "Manual adjustment"))[:120],
            note=str(payload.get("note", "")).strip()[:255],
        )
        db.session.add(movement)
        db.session.commit()
        return jsonify({"movement": movement.as_dict(), "product": product.as_dict()}), 201
    except (TypeError, ValueError):
        db.session.rollback()
        return json_error("product_id and quantity_delta are required")


@api_bp.get("/inventory/adjustments")
def list_inventory_adjustments():
    movements = db.session.scalars(
        db.select(InventoryMovement).order_by(InventoryMovement.created_at.desc()).limit(100)
    ).all()
    return jsonify({"movements": [movement.as_dict() for movement in movements]})


@api_bp.get("/sales")
def list_sales():
    query = str(request.args.get("query", "")).strip()
    statement = db.select(Sale).order_by(Sale.created_at.desc()).limit(100)
    if query:
        statement = statement.where(Sale.receipt_number.ilike(f"%{query}%"))
    sales = db.session.scalars(statement).all()
    return jsonify({"sales": [sale.as_dict() for sale in sales]})


@api_bp.get("/sales/<int:sale_id>")
def get_sale(sale_id: int):
    sale = db.session.get(Sale, sale_id)
    if not sale:
        return json_error("Sale not found", 404)
    return jsonify({"sale": sale.as_dict(include_items=True)})


@api_bp.post("/sales")
def create_sale():
    payload = request.get_json(silent=True) or {}
    raw_items = payload.get("items") or []
    if not raw_items:
        return json_error("At least one item is required")
    try:
        cashier = current_user() or db.session.scalar(db.select(User).order_by(User.id.asc()))
        if not cashier:
            return json_error("A cashier user is required", 400)
        discount = money(payload.get("discount", 0))
        tax_rate = Decimal(str(payload.get("tax_rate", "0.08")))
        payment_method = str(payload.get("payment_method", "card")).lower()
        if payment_method not in {"card", "cash", "transfer"}:
            return json_error("Unsupported payment method")

        sale = Sale(
            receipt_number=f"NF-{datetime.utcnow():%y%m%d}-{uuid4().hex[:6].upper()}",
            cashier=cashier,
            subtotal=0,
            discount=discount,
            tax=0,
            total=0,
            payment_method=payment_method,
        )
        subtotal = Decimal("0.00")
        db.session.rollback()
        with db.session.begin():
            db.session.add(sale)
            for raw_item in raw_items:
                product = db.session.scalar(
                    db.select(Product).where(Product.id == int(raw_item["product_id"])).with_for_update()
                )
                quantity = int(raw_item["quantity"])
                if not product or product.is_archived:
                    raise ValueError("A selected product is unavailable")
                if quantity < 1 or product.stock_quantity < quantity:
                    raise ValueError(f"Insufficient stock for {product.name}")
                line_total = (Decimal(product.price) * quantity).quantize(Decimal("0.01"))
                subtotal += line_total
                product.stock_quantity -= quantity
                sale.items.append(
                    SaleItem(
                        product=product,
                        product_name=product.name,
                        quantity=quantity,
                        unit_price=product.price,
                        line_total=line_total,
                    )
                )
                db.session.add(
                    InventoryMovement(
                        product=product,
                        user=cashier,
                        quantity_delta=-quantity,
                        reason="Sale",
                        note=sale.receipt_number,
                    )
                )
            taxable = max(subtotal - discount, Decimal("0.00"))
            tax = (taxable * tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            sale.subtotal = subtotal
            sale.tax = tax
            sale.total = taxable + tax
        return jsonify({"sale": sale.as_dict(include_items=True)}), 201
    except (ValueError, KeyError, TypeError) as exc:
        db.session.rollback()
        return json_error(str(exc))
    except SQLAlchemyError:
        db.session.rollback()
        return json_error("Could not complete the sale", 503)

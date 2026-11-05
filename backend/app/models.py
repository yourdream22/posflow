from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from . import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False, index=True)
    role = db.Column(db.String(30), nullable=False, default="staff")
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    sales = db.relationship("Sale", back_populates="cashier")


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False, index=True)
    category = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(12, 2), nullable=False)
    cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    stock_quantity = db.Column(db.Integer, nullable=False, default=0)
    reorder_level = db.Column(db.Integer, nullable=False, default=5)
    is_archived = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    movements = db.relationship("InventoryMovement", back_populates="product")
    sale_items = db.relationship("SaleItem", back_populates="product")

    @property
    def status(self) -> str:
        if self.is_archived:
            return "archived"
        if self.stock_quantity <= self.reorder_level:
            return "low"
        return "healthy"

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "sku": self.sku,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "price": float(self.price or 0),
            "cost": float(self.cost or 0),
            "stock_quantity": self.stock_quantity,
            "reorder_level": self.reorder_level,
            "status": self.status,
            "is_archived": self.is_archived,
        }


class InventoryMovement(db.Model):
    __tablename__ = "inventory_movements"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    quantity_delta = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(120), nullable=False)
    note = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    product = db.relationship("Product", back_populates="movements")
    user = db.relationship("User")

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "Unknown product",
            "quantity_delta": self.quantity_delta,
            "reason": self.reason,
            "note": self.note,
            "created_at": self.created_at.isoformat(),
        }


class Sale(db.Model):
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    receipt_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    cashier_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)
    discount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    total = db.Column(db.Numeric(12, 2), nullable=False)
    payment_method = db.Column(db.String(30), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    cashier = db.relationship("User", back_populates="sales")
    items = db.relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

    def as_dict(self, include_items: bool = False) -> dict:
        payload = {
            "id": self.id,
            "receipt_number": self.receipt_number,
            "cashier": self.cashier.name if self.cashier else "Unknown",
            "subtotal": float(self.subtotal or 0),
            "discount": float(self.discount or 0),
            "tax": float(self.tax or 0),
            "total": float(self.total or 0),
            "payment_method": self.payment_method,
            "created_at": self.created_at.isoformat(),
            "item_count": sum(item.quantity for item in self.items),
        }
        if include_items:
            payload["items"] = [item.as_dict() for item in self.items]
        return payload


class SaleItem(db.Model):
    __tablename__ = "sale_items"

    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    product_name = db.Column(db.String(160), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    line_total = db.Column(db.Numeric(12, 2), nullable=False)

    sale = db.relationship("Sale", back_populates="items")
    product = db.relationship("Product", back_populates="sale_items")

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price or 0),
            "line_total": float(self.line_total or 0),
        }

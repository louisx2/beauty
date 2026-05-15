import { useState, useMemo, useEffect } from 'react';
import { useInventoryStore, type Product } from '../../store/inventoryStore';
import { Plus, Search, X, Edit2, Trash2, AlertTriangle, Package, Minus, DollarSign } from 'lucide-react';
import './Inventory.css';

function fmtPrice(p: number) { return `RD$ ${p.toLocaleString('es-DO')}`; }

const CATEGORIES = ['Cuidado Facial', 'Cuidado Corporal', 'Protección', 'Post-Tratamiento', 'Belleza'];

const emptyForm: Omit<Product, 'id'> = {
  name: '', category: 'Cuidado Facial', purchasePrice: 0, salePrice: 0, stock: 0, minStock: 5, unit: 'unidad', active: true,
};

export default function Inventory() {
  const { products, fetchProducts, addProduct, updateProduct, deleteProduct, adjustStock } = useInventoryStore();

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, search]);

  const lowStock = products.filter((p) => p.stock <= p.minStock && p.active);
  const totalValue = products.reduce((a, p) => a + p.salePrice * p.stock, 0);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, purchasePrice: p.purchasePrice, salePrice: p.salePrice, stock: p.stock, minStock: p.minStock, unit: p.unit, active: p.active });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await updateProduct(editingId, form);
    else await addProduct(form);
    setShowModal(false);
  };

  return (
    <div className="inventory">
      <div className="clients__header">
        <div>
          <h1 className="clients__title">Inventario</h1>
          <p className="clients__subtitle">{products.length} productos · Valor: {fmtPrice(totalValue)}</p>
        </div>
        <button className="appts__add-btn" onClick={openCreate} id="btn-new-product"><Plus size={18} /> Nuevo Producto</button>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="inventory__alert-bar">
          <AlertTriangle size={16} />
          <strong>{lowStock.length} productos con bajo stock:</strong>
          {lowStock.map((p) => <span key={p.id}>{p.name} ({p.stock})</span>)}
        </div>
      )}

      {/* Search */}
      <div className="clients__search-bar">
        <div className="appts__search" style={{ maxWidth: 360 }}>
          <Search size={16} />
          <input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} id="inventory-search" />
        </div>
      </div>

      {/* Product Grid */}
      <div className="inventory__grid">
        {filtered.map((p) => {
          const isLow = p.stock <= p.minStock;
          const margin = p.salePrice - p.purchasePrice;
          const marginPct = p.purchasePrice > 0 ? Math.round((margin / p.purchasePrice) * 100) : 0;

          return (
            <div className={`inv-card ${isLow ? 'inv-card--low' : ''} ${!p.active ? 'inv-card--inactive' : ''}`} key={p.id}>
              <div className="inv-card__top">
                <span className="inv-card__cat">{p.category}</span>
                {isLow && <span className="inv-card__low-badge"><AlertTriangle size={12} /> Bajo</span>}
              </div>
              <h3>{p.name}</h3>

              <div className="inv-card__stock-row">
                <button className="inv-card__stock-btn" onClick={() => adjustStock(p.id, -1)} disabled={p.stock <= 0}><Minus size={14} /></button>
                <div className="inv-card__stock-display">
                  <span className={`inv-card__stock-num ${isLow ? 'inv-card__stock-num--low' : ''}`}>{p.stock}</span>
                  <span className="inv-card__stock-label">en stock</span>
                </div>
                <button className="inv-card__stock-btn" onClick={() => adjustStock(p.id, 1)}><Plus size={14} /></button>
              </div>

              <div className="inv-card__prices">
                <div><span>Compra</span><strong>{fmtPrice(p.purchasePrice)}</strong></div>
                <div><span>Venta</span><strong>{fmtPrice(p.salePrice)}</strong></div>
                <div><span>Margen</span><strong className="inv-card__margin">+{marginPct}%</strong></div>
              </div>

              <div className="service-item__actions">
                <button className="appt-card__action-btn" onClick={() => openEdit(p)}><Edit2 size={15} /></button>
                <button className="appt-card__action-btn" onClick={() => deleteProduct(p.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal__form" id="product-form">
              <div className="modal__field">
                <label><Package size={14} /> Nombre</label>
                <input required placeholder="Nombre del producto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="modal__field">
                <label>Categoría</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label><DollarSign size={14} /> Precio Compra (RD$)</label>
                  <input type="number" min={0} value={form.purchasePrice || ''} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
                </div>
                <div className="modal__field">
                  <label><DollarSign size={14} /> Precio Venta (RD$)</label>
                  <input type="number" min={0} value={form.salePrice || ''} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
                </div>
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label>Stock Actual</label>
                  <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
                </div>
                <div className="modal__field">
                  <label>Stock Mínimo</label>
                  <input type="number" min={0} value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
                </div>
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" id="product-submit">{editingId ? 'Guardar' : 'Crear Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

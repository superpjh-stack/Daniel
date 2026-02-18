'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Star,
  Package,
  Minus,
  Check,
  Edit3,
  Trash2,
  Clock,
  Sparkles,
  X,
  Pencil,
  Flame,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Input } from '@/components/ui';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  talentBalance: number;
  grade: number;
}

interface PurchaseRecord {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'all', label: '전체', emoji: '🛍️' },
  { value: 'school', label: '학용품', emoji: '✏️' },
  { value: 'snack', label: '간식', emoji: '🍫' },
  { value: 'culture', label: '문화', emoji: '🎬' },
  { value: 'special', label: '특별', emoji: '🎁' },
  { value: 'etc', label: '기타', emoji: '🎮' },
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  school: '✏️',
  snack: '🍫',
  culture: '🎬',
  special: '🎁',
  etc: '🎮',
};

// 상품별 구매 수 (결정론적 난수)
function getReviewCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 89) + 12;
}

// 별점 (재고/이름 기반 4.0~5.0)
function getRating(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 3) + hash) ^ id.charCodeAt(i);
    hash |= 0;
  }
  const val = 40 + (Math.abs(hash) % 11); // 40~50
  return (val / 10).toFixed(1);
}

// 카테고리별 기본 이미지
function getPlaceholderImage(product: Product): string {
  const seeds: Record<string, string> = {
    school: 'stationery',
    snack: 'food',
    culture: 'books',
    special: 'gift',
    etc: 'toys',
  };
  const seed = seeds[product.category || 'etc'] || 'shop';
  return `https://picsum.photos/seed/${seed}${product.id.slice(-4)}/400/300`;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 인라인 가격 수정
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // 구매 모달
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'confirm'>('select');
  const [saving, setSaving] = useState(false);

  // 상품 폼 모달
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 10,
    stock: 10,
    image: '',
    category: 'etc',
  });

  // 삭제 확인
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // 구매 이력 모달
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState('');
  const [historyData, setHistoryData] = useState<{
    purchases: PurchaseRecord[];
    totalSpent: number;
    purchaseCount: number;
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingPriceId && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPriceId]);

  const fetchData = async () => {
    try {
      const [productsRes, studentsRes, meRes] = await Promise.all([
        fetch('/api/shop/products'),
        fetch('/api/students'),
        fetch('/api/auth/me'),
      ]);

      if (productsRes.ok) setProducts(await productsRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setIsAdmin(me.role === 'admin');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p) => (p.category || 'etc') === selectedCategory);

  const isNewProduct = (product: Product) => {
    const created = new Date(product.createdAt);
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const isHotProduct = (product: Product) => {
    return getReviewCount(product.id) >= 70;
  };

  // --- 인라인 가격 수정 ---
  const startPriceEdit = (product: Product) => {
    setEditingPriceId(product.id);
    setEditingPriceValue(String(product.price));
  };

  const cancelPriceEdit = () => {
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

  const savePriceEdit = async (product: Product) => {
    const newPrice = parseInt(editingPriceValue);
    if (isNaN(newPrice) || newPrice < 1) {
      cancelPriceEdit();
      return;
    }
    if (newPrice === product.price) {
      cancelPriceEdit();
      return;
    }

    setSavingPrice(true);
    try {
      const res = await fetch(`/api/shop/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          price: newPrice,
          stock: product.stock,
          image: product.image,
          category: product.category,
        }),
      });
      if (res.ok) {
        setProducts(prev =>
          prev.map(p => p.id === product.id ? { ...p, price: newPrice } : p)
        );
      }
    } catch (error) {
      console.error('Failed to update price:', error);
    } finally {
      setSavingPrice(false);
      setEditingPriceId(null);
    }
  };

  // --- 구매 ---
  const openPurchaseModal = (product: Product) => {
    setSelectedProduct(product);
    setSelectedStudent('');
    setQuantity(1);
    setPurchaseStep('select');
    setShowPurchaseModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !selectedStudent) return;
    setSaving(true);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, studentId: selectedStudent, quantity }),
      });
      if (res.ok) {
        setShowPurchaseModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '구매에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to purchase:', error);
    } finally {
      setSaving(false);
    }
  };

  // --- 상품 추가/수정 ---
  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: 10, stock: 10, image: '', category: 'etc' });
    setShowProductModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image: product.image || '',
      category: product.category || 'etc',
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name) return;
    setSaving(true);
    try {
      const url = editingProduct ? `/api/shop/products/${editingProduct.id}` : '/api/shop/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      });
      if (res.ok) {
        setShowProductModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSaving(false);
    }
  };

  // --- 상품 삭제 ---
  const openDeleteConfirm = (product: Product) => {
    setDeletingProduct(product);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/shop/products/${deletingProduct.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteConfirm(false);
        setDeletingProduct(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setSaving(false);
    }
  };

  // --- 구매 이력 ---
  const openHistoryModal = async (studentId: string) => {
    setHistoryStudent(studentId);
    setHistoryData(null);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const res = await fetch(`/api/shop/history?studentId=${studentId}`);
      if (res.ok) setHistoryData(await res.json());
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const selectedStudentData = students.find((s) => s.id === selectedStudent);
  const totalPrice = selectedProduct ? selectedProduct.price * quantity : 0;
  const canPurchase = selectedStudentData && totalPrice <= selectedStudentData.talentBalance;
  const historyStudentData = students.find((s) => s.id === historyStudent);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="달란트 시장" subtitle="달란트로 원하는 상품을 구매하세요!" />

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.value
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 액션 바 */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          총 <strong className="text-gray-700">{filteredProducts.length}개</strong> 상품
        </p>
        {isAdmin && (
          <Button variant="secondary" onClick={openAddModal}>
            <Plus size={16} className="mr-1.5" />
            상품 추가
          </Button>
        )}
      </div>

      {/* 상품 목록 */}
      {filteredProducts.length === 0 ? (
        <Card className="text-center py-20">
          <ShoppingBag size={64} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {selectedCategory === 'all' ? '등록된 상품이 없습니다' : '해당 카테고리에 상품이 없습니다'}
          </p>
          {isAdmin && (
            <Button variant="primary" className="mt-4" onClick={openAddModal}>
              첫 상품 추가하기
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product, index) => {
            const rating = getRating(product.id);
            const reviewCount = getReviewCount(product.id);
            const imgSrc = product.image || getPlaceholderImage(product);
            const isNew = isNewProduct(product);
            const isHot = isHotProduct(product);
            const isSoldOut = product.stock === 0;
            const isLowStock = product.stock > 0 && product.stock <= 5;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* 이미지 영역 */}
                <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${isSoldOut ? 'opacity-50 grayscale' : ''}`}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/default${product.id.slice(-3)}/400/300`;
                    }}
                  />
                  {/* 뱃지 */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {isSoldOut && (
                      <span className="px-2 py-0.5 bg-gray-700 text-white text-[10px] font-bold rounded">품절</span>
                    )}
                    {!isSoldOut && isNew && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded flex items-center gap-0.5">
                        <Sparkles size={8} />NEW
                      </span>
                    )}
                    {!isSoldOut && isHot && !isNew && (
                      <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded flex items-center gap-0.5">
                        <Flame size={8} />인기
                      </span>
                    )}
                    {isLowStock && (
                      <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">
                        {product.stock}개 남음
                      </span>
                    )}
                  </div>
                  {/* 카테고리 뱃지 */}
                  <div className="absolute top-2 right-2">
                    <span className="text-base">{CATEGORY_EMOJI[product.category || 'etc']}</span>
                  </div>
                </div>

                {/* 상품 정보 */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[2.5rem] leading-snug">
                    {product.name}
                  </h3>

                  {/* 별점 & 구매수 */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={9}
                          className={parseFloat(rating) >= i ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400">{rating}</span>
                    <span className="text-[10px] text-gray-400">({reviewCount}명)</span>
                  </div>

                  {/* 가격 - 인라인 수정 */}
                  <div className="mt-2 flex-1">
                    {isAdmin && editingPriceId === product.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={priceInputRef}
                          type="number"
                          value={editingPriceValue}
                          onChange={(e) => setEditingPriceValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePriceEdit(product);
                            if (e.key === 'Escape') cancelPriceEdit();
                          }}
                          className="w-16 px-1.5 py-1 text-sm border-2 border-orange-400 rounded font-bold text-orange-600 focus:outline-none"
                          min={1}
                        />
                        <span className="text-xs text-gray-500">달란트</span>
                        <button
                          onClick={() => savePriceEdit(product)}
                          disabled={savingPrice}
                          className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                        >
                          <Check size={10} />
                        </button>
                        <button
                          onClick={cancelPriceEdit}
                          className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                        <span className="text-lg font-bold text-amber-600">{product.price}</span>
                        <span className="text-xs text-gray-500">달란트</span>
                        {isAdmin && (
                          <button
                            onClick={() => startPriceEdit(product)}
                            className="ml-auto p-1 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                            title="가격 수정"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 구매 버튼 */}
                  <button
                    onClick={() => openPurchaseModal(product)}
                    disabled={isSoldOut}
                    className={`w-full mt-2.5 py-2 text-sm font-bold rounded-lg transition-all ${
                      isSoldOut
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                    }`}
                  >
                    {isSoldOut ? '품절' : '구매하기'}
                  </button>

                  {/* 관리자 수정/삭제 */}
                  {isAdmin && (
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        onClick={() => openEditModal(product)}
                        className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[11px] text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit3 size={11} />수정
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(product)}
                        className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[11px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={11} />삭제
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── 구매 모달 ── */}
      <AnimatePresence>
        {showPurchaseModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowPurchaseModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              {purchaseStep === 'select' ? (
                <>
                  {/* 상품 이미지 + 이름 */}
                  <div className="flex items-center gap-4 mb-6 p-3 bg-orange-50 rounded-2xl">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={selectedProduct.image || getPlaceholderImage(selectedProduct)}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800 text-sm line-clamp-2">{selectedProduct.name}</h2>
                      <p className="text-orange-600 font-bold flex items-center gap-1 mt-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        {selectedProduct.price} 달란트
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* 학생 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">구매할 학생</label>
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-400"
                      >
                        <option value="">학생을 선택하세요</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.grade}학년) — ⭐ {s.talentBalance}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 수량 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">수량</label>
                      <div className="flex items-center gap-4">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                          <Minus size={20} />
                        </button>
                        <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                        <button onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>

                    {/* 총 금액 */}
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">총 금액</span>
                        <span className="text-xl font-bold text-orange-600 flex items-center gap-1">
                          <Star size={16} className="fill-amber-400 text-amber-400" />
                          {totalPrice}
                        </span>
                      </div>
                      {selectedStudentData && (
                        <div className="flex justify-between items-center mt-2 text-sm">
                          <span className="text-gray-500">잔액</span>
                          <span className={canPurchase ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                            {selectedStudentData.talentBalance} → {selectedStudentData.talentBalance - totalPrice}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedStudent && (
                      <button
                        onClick={() => openHistoryModal(selectedStudent)}
                        className="w-full flex items-center justify-center gap-1 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                      >
                        <Clock size={16} />구매 이력 보기
                      </button>
                    )}

                    <div className="flex gap-3">
                      <Button variant="ghost" className="flex-1" onClick={() => setShowPurchaseModal(false)}>취소</Button>
                      <button
                        onClick={() => setPurchaseStep('confirm')}
                        disabled={!canPurchase || !selectedStudent}
                        className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-orange-600 transition-colors"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                      <ShoppingBag size={26} className="text-orange-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">구매 확인</h2>
                  </div>
                  <div className="space-y-3 p-4 bg-gray-50 rounded-2xl">
                    <div className="flex justify-between">
                      <span className="text-gray-500">상품</span>
                      <span className="font-medium text-sm text-right max-w-[60%]">{selectedProduct.name} × {quantity}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">학생</span>
                      <span className="font-medium">{selectedStudentData?.name} ({selectedStudentData?.grade}학년)</span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">결제 금액</span>
                      <span className="text-lg font-bold text-orange-600 flex items-center gap-1">
                        <Star size={16} className="fill-amber-400 text-amber-400" />{totalPrice} 달란트
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">잔액 변동</span>
                      <span className="text-emerald-600">⭐ {selectedStudentData?.talentBalance} → ⭐ {(selectedStudentData?.talentBalance || 0) - totalPrice}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="ghost" className="flex-1" onClick={() => setPurchaseStep('select')}>이전</Button>
                    <button
                      onClick={handlePurchase}
                      disabled={saving}
                      className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {saving ? <div className="spinner-sm" /> : <Check size={18} />}
                      구매 확인
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 상품 추가/수정 모달 ── */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProductModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-5">
                {editingProduct ? '상품 수정' : '새 상품 추가'}
              </h2>
              <div className="space-y-4">
                <Input label="상품명 *" placeholder="스테들러 연필 세트" value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                <Input label="설명" placeholder="상품 간단 설명" value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">가격 (달란트) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-400 font-bold text-orange-600"
                        min={1}
                      />
                    </div>
                    {/* 빠른 선택 버튼 */}
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {[5, 10, 20, 30, 50].map((v) => (
                        <button key={v}
                          onClick={() => setProductForm({ ...productForm, price: v })}
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${productForm.price === v ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500 hover:border-orange-300'}`}
                        >{v}</button>
                      ))}
                    </div>
                  </div>
                  <Input label="재고" type="number" value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })} />
                </div>

                <Input label="이미지 URL" placeholder="https://..." value={productForm.image}
                  onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} />
                {productForm.image && (
                  <div className="w-full h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                    <img src={productForm.image} alt="미리보기" className="max-w-full max-h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                      <button key={cat.value}
                        onClick={() => setProductForm({ ...productForm, category: cat.value })}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                          productForm.category === cat.value
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <span>{cat.emoji}</span>{cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowProductModal(false)}>취소</Button>
                  <button
                    onClick={handleSaveProduct}
                    disabled={saving || !productForm.name}
                    className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
                  >
                    {saving ? '저장 중...' : (editingProduct ? '저장하기' : '추가하기')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 삭제 확인 ── */}
      <AnimatePresence>
        {showDeleteConfirm && deletingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">상품 삭제</h3>
                <p className="text-gray-500 mt-2"><strong>{deletingProduct.name}</strong>을(를) 삭제하시겠습니까?</p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>취소</Button>
                <button onClick={handleDelete} disabled={saving}
                  className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {saving ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 구매 이력 모달 ── */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">{historyStudentData?.name} 구매 이력</h2>
                <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              {historyLoading ? (
                <div className="flex items-center justify-center py-10"><div className="spinner" /></div>
              ) : historyData ? (
                <>
                  <div className="flex gap-4 p-3 bg-orange-50 rounded-xl mb-4">
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500">총 사용</p>
                      <p className="font-bold text-orange-600 flex items-center justify-center gap-1">
                        <Star size={12} className="fill-amber-400 text-amber-400" />{historyData.totalSpent}
                      </p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500">구매 건수</p>
                      <p className="font-bold text-orange-600">{historyData.purchaseCount}건</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {historyData.purchases.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">구매 이력이 없습니다</p>
                    ) : historyData.purchases.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{p.reason}</p>
                          <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</p>
                        </div>
                        <span className="text-sm font-bold text-red-500">{p.amount}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 py-8">이력을 불러올 수 없습니다</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
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
  X
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
  { value: 'all', label: '전체' },
  { value: 'school', label: '학용품' },
  { value: 'snack', label: '간식' },
  { value: 'culture', label: '문화' },
  { value: 'special', label: '특별' },
  { value: 'etc', label: '기타' },
] as const;

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

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

  const fetchData = async () => {
    try {
      const [productsRes, studentsRes, meRes] = await Promise.all([
        fetch('/api/shop/products'),
        fetch('/api/students'),
        fetch('/api/auth/me'),
      ]);

      if (productsRes.ok) {
        setProducts(await productsRes.json());
      }
      if (studentsRes.ok) {
        setStudents(await studentsRes.json());
      }
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

  // 카테고리 필터링
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p) => (p.category || 'etc') === selectedCategory);

  // 배지 판별
  const isNewProduct = (product: Product) => {
    const created = new Date(product.createdAt);
    const now = new Date();
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
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
        body: JSON.stringify({
          productId: selectedProduct.id,
          studentId: selectedStudent,
          quantity,
        }),
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
      const url = editingProduct
        ? `/api/shop/products/${editingProduct.id}`
        : '/api/shop/products';
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
      const res = await fetch(`/api/shop/products/${deletingProduct.id}`, {
        method: 'DELETE',
      });

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
      if (res.ok) {
        setHistoryData(await res.json());
      }
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
      <Header title="달란트 시장" subtitle="달란트로 상품을 구매하세요!" />

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-purple-500 text-white shadow-md'
                : 'bg-white/80 text-gray-600 hover:bg-purple-50 border border-purple-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 관리자 액션 바 */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-500">
          {filteredProducts.length}개 상품
        </p>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={openAddModal}>
              <Plus size={18} className="mr-2" />
              상품 추가
            </Button>
          )}
        </div>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              className="bg-white/90 backdrop-blur-lg rounded-2xl overflow-hidden border border-purple-100 shadow-sm relative"
            >
              {/* 배지 */}
              <div className="absolute top-2 left-2 z-10 flex gap-1">
                {product.stock === 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    SOLD OUT
                  </span>
                )}
                {product.stock > 0 && isNewProduct(product) && (
                  <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-0.5">
                    <Sparkles size={10} />
                    NEW
                  </span>
                )}
              </div>

              {/* 상품 이미지 */}
              <div className={`aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center ${product.stock === 0 ? 'opacity-50' : ''}`}>
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <Package size={48} className={`text-purple-300 ${product.image ? 'hidden' : ''}`} />
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="font-bold text-gray-800 truncate flex-1">{product.name}</h3>
                  {product.category && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded-full whitespace-nowrap">
                      {CATEGORIES.find((c) => c.value === product.category)?.label || '기타'}
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="text-sm text-gray-500 truncate mt-1">{product.description}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-amber-500 fill-amber-400" />
                    <span className="font-bold text-amber-600">{product.price}</span>
                  </div>
                  <Badge variant={product.stock > 0 ? 'green' : 'red'}>
                    {product.stock > 0 ? `${product.stock}개` : '품절'}
                  </Badge>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => openPurchaseModal(product)}
                  disabled={product.stock === 0}
                >
                  {product.stock === 0 ? '품절' : '구매하기'}
                </Button>

                {/* 관리자 수정/삭제 버튼 */}
                {isAdmin && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <Edit3 size={14} />
                      수정
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(product)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 구매 모달 */}
      <AnimatePresence>
        {showPurchaseModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPurchaseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              {purchaseStep === 'select' ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
                      <ShoppingBag size={32} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedProduct.name}</h2>
                    <p className="text-gray-500 flex items-center justify-center gap-1 mt-1">
                      <Star size={16} className="text-amber-500 fill-amber-400" />
                      {selectedProduct.price} 달란트
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* 학생 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">구매할 학생</label>
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                      >
                        <option value="">학생을 선택하세요</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.grade}학년) - ⭐ {s.talentBalance}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 수량 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">수량</label>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Minus size={20} />
                        </button>
                        <span className="text-xl font-bold">{quantity}</span>
                        <button
                          onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>

                    {/* 총 금액 */}
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">총 금액</span>
                        <span className="text-xl font-bold text-amber-600 flex items-center gap-1">
                          <Star size={18} className="fill-amber-400 text-amber-400" />
                          {totalPrice}
                        </span>
                      </div>
                      {selectedStudentData && (
                        <div className="flex justify-between items-center mt-2 text-sm">
                          <span className="text-gray-500">잔액</span>
                          <span className={canPurchase ? 'text-emerald-600' : 'text-red-600'}>
                            {selectedStudentData.talentBalance} → {selectedStudentData.talentBalance - totalPrice}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 구매 이력 버튼 */}
                    {selectedStudent && (
                      <button
                        onClick={() => openHistoryModal(selectedStudent)}
                        className="w-full flex items-center justify-center gap-1 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                      >
                        <Clock size={16} />
                        구매 이력 보기
                      </button>
                    )}

                    <div className="flex gap-3 mt-6">
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={() => setShowPurchaseModal(false)}
                      >
                        취소
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => setPurchaseStep('confirm')}
                        disabled={!canPurchase || !selectedStudent}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* 구매 확인 단계 (FR-09) */
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                      <ShoppingBag size={28} className="text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">구매 확인</h2>
                  </div>

                  <div className="space-y-3 p-4 bg-gray-50 rounded-2xl">
                    <div className="flex justify-between">
                      <span className="text-gray-500">상품</span>
                      <span className="font-medium">{selectedProduct.name} × {quantity}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">학생</span>
                      <span className="font-medium">{selectedStudentData?.name} ({selectedStudentData?.grade}학년)</span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">총 결제 금액</span>
                      <span className="text-lg font-bold text-amber-600 flex items-center gap-1">
                        <Star size={16} className="fill-amber-400 text-amber-400" />
                        {totalPrice} 달란트
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">잔액 변동</span>
                      <span className="text-emerald-600">
                        ⭐ {selectedStudentData?.talentBalance} → ⭐ {(selectedStudentData?.talentBalance || 0) - totalPrice}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setPurchaseStep('select')}
                    >
                      이전
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={handlePurchase}
                      isLoading={saving}
                    >
                      <Check size={18} className="mr-2" />
                      구매 확인
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상품 추가/수정 모달 */}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {editingProduct ? '상품 수정' : '새 상품 추가'}
              </h2>

              <div className="space-y-4">
                <Input
                  label="상품명 *"
                  placeholder="연필 세트"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />

                <Input
                  label="설명"
                  placeholder="상품 설명"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="가격 (달란트)"
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                  />
                  <Input
                    label="재고"
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                  />
                </div>

                <Input
                  label="이미지 URL"
                  placeholder="https://example.com/image.jpg"
                  value={productForm.image}
                  onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                />

                {/* 이미지 미리보기 */}
                {productForm.image && (
                  <div className="w-full h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                    <img
                      src={productForm.image}
                      alt="미리보기"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* 카테고리 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                  >
                    {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowProductModal(false)}
                  >
                    취소
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleSaveProduct}
                    isLoading={saving}
                    disabled={!productForm.name}
                  >
                    {editingProduct ? '저장하기' : '추가하기'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 삭제 확인 다이얼로그 */}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="text-center mb-4">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">상품 삭제</h3>
                <p className="text-gray-500 mt-2">
                  <strong>{deletingProduct.name}</strong>을(를) 삭제하시겠습니까?
                </p>
                <p className="text-sm text-gray-400 mt-1">삭제된 상품은 목록에서 사라집니다.</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 !bg-red-500 hover:!bg-red-600"
                  onClick={handleDelete}
                  isLoading={saving}
                >
                  삭제
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 구매 이력 모달 */}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  {historyStudentData?.name} 구매 이력
                </h2>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="spinner" />
                </div>
              ) : historyData ? (
                <>
                  <div className="flex gap-4 p-3 bg-purple-50 rounded-xl mb-4">
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500">총 사용</p>
                      <p className="font-bold text-purple-600 flex items-center justify-center gap-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        {historyData.totalSpent}
                      </p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500">구매 건수</p>
                      <p className="font-bold text-purple-600">{historyData.purchaseCount}건</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {historyData.purchases.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">구매 이력이 없습니다</p>
                    ) : (
                      historyData.purchases.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{p.reason}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-red-500">{p.amount}</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 py-8">구매 이력을 불러올 수 없습니다</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

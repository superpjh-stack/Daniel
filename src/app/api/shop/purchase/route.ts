import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { executePurchaseTransaction } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, studentId, quantity } = await request.json();

    if (!productId || !studentId || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (quantity < 1) {
      return NextResponse.json({ error: '수량은 1 이상이어야 합니다.' }, { status: 400 });
    }

    const result = await executePurchaseTransaction(productId, studentId, quantity);

    return NextResponse.json({
      success: true,
      remainingBalance: result.remainingBalance,
      remainingStock: result.remainingStock,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
      }
      if (error.message === 'STOCK_INSUFFICIENT') {
        return NextResponse.json({ error: '재고가 부족합니다.' }, { status: 400 });
      }
      if (error.message === 'STUDENT_NOT_FOUND') {
        return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
      }
      if (error.message === 'BALANCE_INSUFFICIENT') {
        return NextResponse.json({ error: '달란트가 부족합니다.' }, { status: 400 });
      }
    }
    console.error('Purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllProducts, createProduct } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: '관리자만 상품을 관리할 수 있습니다.' }, { status: 403 });
    }

    const { name, description, price, stock, image, category } = await request.json();

    if (!name || !price) {
      return NextResponse.json({ error: '상품명과 가격은 필수입니다.' }, { status: 400 });
    }

    const id = `product-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await createProduct({ id, name, description, price, stock: stock || 0, image, category });

    return NextResponse.json({ id, name, price });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete('token');
  response.cookies.delete('user_role');
  response.cookies.delete('user_name');

  return response;
}

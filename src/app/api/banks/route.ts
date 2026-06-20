import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch banks from Paystack');
    }

    // Paystack returns an array under the 'data' property
    const banks = data.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
    }));

    // Sort alphabetically by name
    banks.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json(banks);
  } catch (error: any) {
    console.error('Paystack Banks Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

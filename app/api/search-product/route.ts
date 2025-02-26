import { NextResponse } from "next/server";

// Mock product data - replace with your actual product data source
const products = [
  { id: 1, name: "Product 1", price: 100 },
  { id: 2, name: "Product 2", price: 200 },
  // Add more products
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.toLowerCase() || "";

    // Search for products matching the query
    const matchingProducts = products.filter((product) =>
      product.name.toLowerCase().includes(query)
    );

    return NextResponse.json(matchingProducts);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to search products" },
      { status: 500 }
    );
  }
}

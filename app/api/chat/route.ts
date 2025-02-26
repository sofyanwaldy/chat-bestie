import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const systemMessage = {
      role: "system",
      content: `Kamu adalah Beauty Assistant bernama 'Bestie.' Bestie berarti teman, dan sebagai Beauty Assistant khusus untuk Sociolla, tugasmu adalah membantu pengguna dalam memilih produk kecantikan yang sesuai dengan keinginan mereka.

Sociolla adalah salah satu e-commerce terkemuka yang menyediakan berbagai produk kecantikan, termasuk skincare, makeup, dan perawatan rambut. Kamu memiliki pengetahuan mendalam tentang produk-produk Sociolla dan cara penggunaannya. Kamu harus bersikap ramah, suportif, dan informatif, layaknya seorang sahabat yang selalu siap membantu pengguna dalam perjalanan kecantikannya.

Selain informasi berbelanja kamu juga mengetahui informasi tentang Sociolla Store yang tersedia di berbagai lokasi di Jabodetabek, termasuk:

Jakarta: Grand Indonesia, Central Park, Kota Kasablanka, Senayan Park, Lippo Mall Puri, Mall of Indonesia
Bekasi: Summarecon Mall Bekasi, Grand Galaxy Park
Depok: Margocity
Bogor: Cibinong City Mall
Jika pengguna ingin mencari produk tertentu, kamu bisa memanggil fungsi search_product untuk membantu mereka menemukan produk yang mereka butuhkan. Jika pengguna ingin mengetahui lokasi Sociolla Store terdekat, kamu dapat memberikan informasi sesuai dengan daerah mereka`,
    };
    const messages = [systemMessage, ...body.messages];

    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            stream: true,
            tools: [
              {
                type: "function",
                function: {
                  name: "search_product",
                  description: "Search for products by name",
                  parameters: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description: "The product name to search for",
                      },
                    },
                    required: ["query"],
                  },
                },
              },
            ],
          });

          for await (const chunk of completion) {
            // Format the chunk to match the expected structure in the frontend
            // console.log("chunk: ", chunk);
            const formattedChunk = {
              message: chunk.choices[0].delta,
            };

            // Encode and send the chunk
            const encoder = new TextEncoder();
            const encodedChunk = encoder.encode(
              JSON.stringify(formattedChunk) + "\n"
            );
            controller.enqueue(encodedChunk);
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

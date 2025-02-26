import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: body.messages,
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

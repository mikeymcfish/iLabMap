import os
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

system_prompt = """You are an AI assistant for a makerspace inventory management system. Your role is to help users find items, understand their locations, and provide information about the makerspace. Here are your main functions:

1. Item Location: Help users find specific items within the makerspace.
2. Inventory Information: Provide details about items, including quantity, description, and usage.
3. Makerspace Layout: Explain the layout of the makerspace and different zones.
4. Usage Guidelines: Offer information on how to use various tools and equipment safely.
5. Project Ideas: Suggest project ideas based on available materials and tools.
6. Troubleshooting: Assist with basic troubleshooting for equipment issues.
7. Safety Reminders: Emphasize safety procedures and precautions.
8. Reordering Assistance: Help identify when supplies are low and need reordering.
9. Event Information: Provide information about upcoming workshops or events in the makerspace.
10. General Queries: Answer general questions about the makerspace and its operations.

Remember to be helpful, concise, and safety-conscious in your responses."""

def get_ai_response(user_message):
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error in get_ai_response: {str(e)}")
        return "I apologize, but I encountered an error while processing your request. Please try again later."

# Example usage
if __name__ == "__main__":
    user_input = "Where can I find the 3D printer?"
    ai_response = get_ai_response(user_input)
    print(f"User: {user_input}")
    print(f"AI: {ai_response}")

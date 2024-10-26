from openai import OpenAI
import os
import json
from models import Item
from flask import current_app, jsonify
from utils import list_available_items, get_item_location

client = OpenAI()

system_prompt = ("""
Return all responses in JSON format.

Provide guidance on using specific tools within the Innovation Lab.

- Identify the tools available and their purposes.
- Offer step-by-step instructions for using each tool safely and effectively.
- Highlight best practices for maximizing efficiency and output.
- Include any safety precautions or necessary preparations.
- When relevant, provide item IDs to show on the map.

# Output Format

You must return your responses as JSON objects with this exact structure:
{
    "message": "Your main response text here",
    "markers": [
        {
            "item_id": "id of the item to mark",
            "reason": "brief explanation of why this item is relevant"
        }
    ]
}

Keep your responses short unless asked for more information. Keep your tone friendly with a hint of informality. Responses should be phrased with a target audience of teenagers.

# Notes

- When possible, prefer these software tools: Adobe Illustrator, Adobe Photoshop, OnShape, Simplify3d, Preform, tinkercad
- Below are the available resources within the iLab. Limit your responses to focus on these items:
""")

def get_available_items_text():
    with current_app.app_context():
        items = list_available_items()
    return str(items)

available_items_text = ""
assistant = None

def initialize_assistant():
    global assistant, available_items_text
    available_items_text = get_available_items_text()
    assistant = client.beta.assistants.update(
        "asst_42fSiwjxCUq9i93OpVATPcSn",
        instructions=system_prompt + available_items_text,
        tools=[],
        model="gpt-4-turbo"
    )

def process_response(response_data: dict) -> dict:
    try:
        # Extract the message and markers
        message = response_data.get('message', '')
        markers = response_data.get('markers', [])

        # Prepare marker details to send to the client
        marker_details = []
        for marker in markers:
            item_id = marker.get('item_id')
            if item_id:
                with current_app.app_context():
                    item = get_item_location(item_id)
                    if item:
                        # Convert item to dict and include coordinates
                        item_data = item.to_dict()  # item.to_dict() should include modelx, modely, modelz
                        marker_details.append({
                            "item_id": item_id,
                            "x_coord_model": item_data.get("x_coord_model"),
                            "y_coord_model": item_data.get("y_coord_model"),
                            "z_coord_model": item_data.get("z_coord_model"),
                            "reason": marker.get("reason")
                        })
                    else:
                        current_app.logger.warning(f"Item not found for item_id {item_id}")

        # Return structured response with message and marker details
        return {
            "message": message,
            "markers": marker_details
        }

    except Exception as e:
        current_app.logger.error(f"Error processing response: {str(e)}")
        return {"message": "An error occurred while processing your request."}


def get_ai_response(user_message: str) -> dict:
    global available_items_text

    if assistant is None:
        initialize_assistant()

    thread = client.beta.threads.create()

    formatted_message = (
        "Please provide your response in JSON format. "
        f"User question: {user_message}"
    )

    client.beta.threads.messages.create(
        thread_id=thread.id,
        role='user',
        content=formatted_message
    )

    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant.id
    )

    while run.status != 'completed':
        run = client.beta.threads.runs.retrieve(
            thread_id=thread.id,
            run_id=run.id
        )

    messages = client.beta.threads.messages.list(thread_id=thread.id)
    response = messages.data[0].content[0].text.value

    try:
        response_data = json.loads(response)
        return process_response(response_data)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {str(e)}")
        return {
            'message': response,
            'markers': []
        }
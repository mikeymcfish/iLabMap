from openai import OpenAI
import os
from models import Item
from flask import current_app, jsonify
from utils import list_available_items

client = OpenAI()

# system prompt
system_prompt = ("""
Provide guidance on using specific tools within the Innovation Lab.

- Identify the tools available and their purposes.
- Offer step-by-step instructions for using each tool safely and effectively.
- Highlight best practices for maximizing efficiency and output.
- Include any safety precautions or necessary preparations.

# Output Format

Deliver the guidance in a structured paragraph format and bullet points. Keep your responses short unless asked for more information. End every response with a prompt to learn more or see if the user wants ideas. Keep your tone friendly with a hint of informality. Responses should be phrased with a target audience of teenagers.

# Notes

- When possible, prefer these software tools: Adobe Illustrator, Adobe Photoshop, OnShape, Simplify3d, Preform, tinkercad
- Below are the available resources within the iLab. Limit your responses to focus on these items:
""")

def get_available_items_text():
    with current_app.app_context():
        items = list_available_items()
    return str(items)  # Convert the items list to string

# Initialize with an empty string, we'll update it within the application context
available_items_text = ""

assistant = None

def initialize_assistant():
    global assistant, available_items_text
    available_items_text = get_available_items_text()
    assistant = client.beta.assistants.update("asst_42fSiwjxCUq9i93OpVATPcSn",
        instructions=system_prompt + available_items_text
    )

def get_ai_response(user_message: str) -> str:
    global available_items_text

    if assistant is None:
        initialize_assistant()

    # Update available items before each response
    # available_items_text = get_available_items_text()

    thread = client.beta.threads.create()
    client.beta.threads.messages.create(
        thread_id=thread.id,
        role='user',
        content=user_message
    )
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant.id
    )
    run = client.beta.threads.runs.retrieve(
        thread_id=thread.id,
        run_id=run.id
    )
    while run.status != 'completed':
        run = client.beta.threads.runs.retrieve(
            thread_id=thread.id,
            run_id=run.id
        )
    messages = client.beta.threads.messages.list(thread_id=thread.id)
    return messages.data[0].content[0].text.value
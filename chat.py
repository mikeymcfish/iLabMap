from openai import OpenAI
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Item, Map
from app import db

client = OpenAI()

def get_lab_inventory():
    items = Item.query.all()
    inventory = "Current Lab Inventory:\n"
    for item in items:
        inventory += f"- {item.name} (Quantity: {item.quantity})\n"
    return inventory

def update_system_prompt():
    global system_prompt
    inventory = get_lab_inventory()
    system_prompt = f"""
Provide guidance on using specific tools within the Innovation Lab.

- Identify the tools available and their purposes.
- Offer step-by-step instructions for using each tool safely and effectively.
- Highlight best practices for maximizing efficiency and output.
- Include any safety precautions or necessary preparations.

{inventory}

# Steps

1. **Identify the Tool**: Recognize which tool the guidance is about.
2. **Safety Precautions**: Outline necessary safety measures before using the tool.
3. **Instructions**: Give clear, step-by-step instructions on how to use the tool.
4. **Best Practices**: Provide tips and tricks for getting the best results with the tool.
5. **Troubleshooting**: Offer solutions for common issues that may arise.

# Output Format

Deliver the guidance in a structured paragraph format, covering each of the steps comprehensively.

# Examples

### Example 1
**Input**: Laser Cutter  
**Output**:  
To use the laser cutter, start by wearing the appropriate safety glasses to protect your eyes. Ensure the material to be cut is securely placed on the cutting bed. Use the software interface to load your design and adjust the settings for power and speed according to the material specifications. Test the alignment with a low-power test run. Start the cut and monitor progress, particularly watching for any flames or malfunctions. Use the ventilation system to clear smoke. After completion, carefully remove the cut pieces and clean the cutting bed. If the laser doesn't cut through completely, check lens alignment and focus.

# Notes

- Ensure all users are trained before using any tool.
- Proper maintenance of tools is essential for optimal function and longevity.
- Limit your responses to a maximum of 200 words.
- Limit your knowledge to the following tools and resources:
laser cutter, formlabs 3d printer, vinyl cutter, arduino, soldering irons, hammers, drill bits, screwdrivers, wrenches, clamps, tape, screws
"""

update_system_prompt()

assistant = client.beta.assistants.create(
    name='iLab Assistant',
    instructions=system_prompt,
    tools=[{'type': 'code_interpreter'}],
    model='gpt-4-1106-preview'
)

def get_ai_response(user_message: str) -> str:
    update_system_prompt()  # Update the system prompt before each chat session
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
    
    # Wait for the run to complete
    while run.status != 'completed':
        run = client.beta.threads.runs.retrieve(
            thread_id=thread.id,
            run_id=run.id
        )
    
    # Retrieve the assistant's response
    messages = client.beta.threads.messages.list(thread_id=thread.id)
    assistant_message = next((msg for msg in messages if msg.role == 'assistant'), None)
    
    if assistant_message and assistant_message.content:
        return assistant_message.content[0].text.value
    else:
        return "I'm sorry, I couldn't generate a response. Please try again."

# Function to handle the chat session
def chat_session(user_message: str) -> dict:
    try:
        response = get_ai_response(user_message)
        return {"status": "success", "message": response}
    except Exception as e:
        return {"status": "error", "message": str(e)}

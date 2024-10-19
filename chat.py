from openai import OpenAI
import os

client = OpenAI()

# system prompt
system_prompt = ("""
Provide guidance on using specific tools within the Innovation Lab.

- Identify the tools available and their purposes.
- Offer step-by-step instructions for using each tool safely and effectively.
- Highlight best practices for maximizing efficiency and output.
- Include any safety precautions or necessary preparations.

# Steps

1. **Identify the Tool**: Recognize which tool the guidance is about.
2. **Safety Precautions**: Outline necessary safety measures before using the tool.
3. **Instructions**: Give clear, step-by-step instructions on how to use the tool.
4. **Best Practices**: Provide tips and tricks for getting the best results with the tool.
5. **Troubleshooting**: Offer solutions for common issues that may arise.

# Output Format

Deliver the guidance in a structured paragraph format, covering each of the steps comprehensively.

# Notes

- Ensure all users are trained before using any tool.
- Proper maintenance of tools is essential for optimal function and longevity.
- Limit your responses to a maximum of 200 words.
- Limit your knowledge to the following tools and resources:
laser cutter, formlabs 3d printer, vinyl cutter, arduino, soldering irons, hammers, drill bits, screwdrivers, wrenches, clamps, tape, screws
""")

assistant = client.beta.assistants.retrieve("asst_2bIC4miLv39XSayFRDJnUKOU")
#     name='iLab Assistant',
#     instructions=system_prompt,
#     tools=[{'type': 'code_interpreter'}],
#     model='gpt-4-1106-preview'
# )

def get_ai_response(user_message: str) -> str:
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

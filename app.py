from openai import OpenAI

client = OpenAI(api_key="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",
base_url ="https://openrouter.ai/api/v1")

chat = client.chat.completions.create(
    model="deepseek/deepseek-r1:free",
    messages=[
        {"role": "user", "content": "Cuantas letras r tiene la palabra perro? (siempre responde en español)"}
    ]
)

print(chat.choices[0].message.content)
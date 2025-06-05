import os
from openai import OpenAI

client = OpenAI(api_key="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")

try:
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=10
    )
    print("✅ Cheia este VALIDĂ!")
    print(response.choices[0].message.content.strip())
except Exception as e:
    print("❌ Cheia este INVALIDĂ!")
    print(e)
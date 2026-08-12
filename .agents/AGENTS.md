# Agent Rules for CoachNode

## AI Model Selection and API Setup
- **DO NOT** use Google's Gemini API directly from the client if there is a risk of geo-blocking (e.g. users in Venezuela).
- **ALWAYS USE** OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) as the provider for LLM capabilities when a free and geo-restriction-free tier is required.
- **Dynamic Free Model:** Always use the model slug `"openrouter/free"` instead of specific model names like `meta-llama/llama-3.1-8b-instruct:free`. This ensures the application automatically routes to the best available free model at any given time and prevents outages if a specific model is removed from the free tier.
- Ensure the API key is requested via the environment variable `VITE_OPENROUTER_API_KEY`.

---
tweet_id: "2028296136281522226"
author: "@itsandrewgao"
author_name: "andrew gao"
date: "2026-03-02"
url: "https://x.com/itsandrewgao/status/2028296136281522226"
captured: "2026-03-02T05:36:01.298Z"
status: researched
has_images: false
has_thread: false
has_quote_tweet: false
---

# @itsandrewgao — andrew gao

> @cognition @stanford; prev @sequoia @LangChainAI @pika_labs @nomic_ai; Z Fellow 🇺🇸; views my own  
> Followers: 42.8K. Verified: no.

---

more frontend vibecoding tips (results below):

WHY YOUR VIBECODED FRONTENDS ALL LOOK THE SAME AND SUCK:
when asked to make a frontend, the agent/llm will default to the center/average of its training data (in a very loose sense). through the training process, the model essentially converges on some default UI style. it's very capable of doing things that are different from this style, but you have to ask! for instance, ChatGPT tends to reply in the same tone for all users untill you interact with it and instruct it differently ("be sassy", "eli5").

the second reason is that most of us are not good at coming up with designs and describing them precisely (see my tweet on a crash course in common components, which i'll link below). treat frontend generation just like any other eng task! you need to provide a good detailed spec.

TIPS:
1. give ur agent screenshots of designs you like (you may not know the right words to describe them but the agent will! a pic = 1000 words)

where to find ui inspo? Behance, Dribbble, Mobbin (Mobbin is paid but worth it!)

2. ask ur agent for proposals, this helps "seed" different directions so the final frontend stands out. don't be afraid to go back and forth.

3. ban certain tendencies: no Inter/Roboto, no shadcn (controversial), no gradients, no emojis

4. encourage the agent to be extreme and make bold decisions, not safe ones. i think that the underlying models tend to get taught during RL/fine-tuning to make conservative choices that produce reasonable but boring frontends

5. give ur agent @figma MCP. the best results will come if you mockup your vision in Figma first.

6. Ideally choose an agent with vision capabilities

TLDR: Most people are tremendously underusing agents for frontend design. They are much better than you might expect.

> **Note:** This tweet contains a video — not captured. View at source URL.

---

*Captured: 2026-03-02T05:36:01.298Z*  
*Source: https://x.com/itsandrewgao/status/2028296136281522226*

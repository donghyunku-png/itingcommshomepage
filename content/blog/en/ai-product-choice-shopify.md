---
title: "The Same Products Did Not Lead AI Models to the Same Choice"
slug: "ai-product-choice-shopify"
category: "AI Trends"
description: "Revisiting the difference between AI visibility and purchase consideration through a Shopify product-selection experiment"
author: "ITING Communications"
published: "2026-11-04"
updated: "2026-11-04"
draft: false
sources:
---

# The Same Products Did Not Lead AI Models to the Same Choice

## Is it enough for our product to appear?

Our product is now included in a list that AI can read. Its name and price are displayed correctly. Does that mean AI will recommend it when a customer asks about related products?

One process is still unexamined: how the AI chooses among the products in that list. A brand may have confirmed that its product information is being delivered, but what it wants to know is whether the product is any closer to being chosen by a customer.

Shopify makes the same distinction. Its official guidance says that inclusion in the catalog does not guarantee appearance in a particular AI answer or a fixed ranking. The catalog supplies product information; each channel determines the final ranking, presentation, and shopping experience. [Shopify Catalog: official guidance](https://help.shopify.com/en/manual/shopify-catalog)

A recently published experiment looked directly at this gap. What happens when the product-retrieval process stays fixed but the AI model making the choice changes?

## The most-selected product changed even with the same list

Slobodan Manic presented the same lists of 20 Shopify products for each query to Claude Haiku 4.5, Sonnet 5, and Opus 5. Each model saw the same information, including product name, price, rating, and review count, and was asked to choose one product.

Across six product categories, each model made 50 selections. There was no category in which the same product was the most-selected item for all three models. Two models did sometimes choose the same product, so this does not mean the three models always made three different choices.

In a separate sunscreen experiment, adding price and skin-type constraints changed the result. None of the three models selected the previous $48 product. Of 300 selections, 298 were for products priced below $25; the remaining two were priced at exactly $25. [Original experiment](https://nohacks.co/blog/three-ai-models-picked-different-products)

The reported experiment comprised 900 product-category comparisons, 600 sunscreen-condition comparisons, and 480 list-order comparisons, for a total of 1,980 trials. It used catalog snapshots obtained on October 15 and 24, 2026, in a U.S. non-logged-in buyer context. All three models came from the same company and received short instructions without tools or web access. The study did not test a live shopping application or execute any orders. [Method and limitations](https://www.searchenginejournal.com/3-ai-models-shopped-shopifys-catalog-each-picked-a-different-winner/594298/)

## Search and selection should be measured separately

These results should not be treated as a scorecard for every AI shopping service. They are, however, a useful starting point for deciding what a brand needs to examine.

Imagine that a bag from a particular brand appears in an AI answer. Should all three of the following answers count as the same result?

- The brand name appears only in a sentence describing several bags.
- The bag is included among three purchase candidates that fit the customer's conditions.
- The bag is recommended as one of the candidates, but the answer gives the wrong size for its laptop compartment.

This is a hypothetical example for explanation. The first answer confirms presence. The second shows whether the product entered the purchase shortlist. The third requires a factual-accuracy check, separate from whether the product was recommended.

A measurement sheet should therefore place separate fields beside “Did it appear?”: “Was it presented as a purchase candidate?”, “Did it meet the stated conditions?”, and “Was the description accurate?” Passing one field should not be treated as passing the others.

## Start by defining the customer's conditions

For a bag brand, “Recommend a bag for commuting” may be a useful opening question. On its own, however, it does not define the customer being examined precisely enough.

Someone who commutes by subway may need a different bag from someone who rides a bicycle. Whether the person carries a laptop, expects rain, or has a particular budget also matters. These conditions are not decorations added to make a product look better. They are criteria for deciding which customer the product suits.

When designing a measurement, begin with conditions that recur in actual consultations and reviews. Add those conditions to questions one at a time and record what changed. If budget, use case, and material all change together, it becomes difficult to connect a difference in the result to any one condition.

It is also important to check whether the questions point only toward the strengths of our own product. A recommendation rate produced from conditions selected to favor our product describes only those conditions. It cannot be read as overall customer preference or market share.

## Check the information being delivered before editing the product page

It is also necessary to understand how the product page a customer sees connects to the product information delivered to an AI channel.

Shopify says that it delivers structured information such as product names, descriptions, options, images, prices, and availability. Stores that keep product names or descriptions in separate fields can use data mapping to identify the source the catalog should read. Shopify also supports grouping separate products that represent options into a single listing. [Product-data delivery and mapping guidance](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products)

A review should therefore go beyond reading the words on the screen. It should confirm which product and option each statement is being delivered for. For example, the weight of a small bag and the storage dimensions of a large bag should not be combined as though they described one product. This is another hypothetical review example, not an error observed for a particular brand.

In practice, a team can select one representative product and check the following together:

- Do the product name, model name, color, and size options match?
- Can the current price, inventory, and available sales regions be confirmed?
- Is it clear which option each function and measurement applies to?
- Does every performance statement have verifiable support?
- If a correction is needed, which team must update which source record?

Shopify's developer documentation also notes that some fields may be inferred by AI and that their accuracy can vary with the data provided. That is a reason to compare delivered fields with the source rather than treating every field as final information written directly by the brand. [Catalog developer guidance](https://shopify.dev/docs/agents/catalog)

## Record measurement conditions when comparing results

If a brand-name query is tested with one model this week and a use-case-only query is tested with another model next week, the results are difficult to compare directly. It is impossible to tell whether the brand's position, the question, or the model caused the change.

Even a small review should record every observable condition, including the service and model, question, measurement date, and login state. Questions that include the brand name should be separated from those that do not. Results should first be compared under the same conditions before being combined into an overall average.

Missing answers should also be marked separately. A normal answer that does not contain our product is different from a result that could not be checked because of an error. Combining both as “not recommended” makes it harder to decide what needs to be fixed.

When recording observations, a team must follow the data-retention and usage terms of the service it uses. Shopify's catalog developer guidance specifically says that search results may not be cached. Rather than copying a public experiment's procedure, confirm what is currently permitted first. [Catalog usage guidance](https://shopify.dev/docs/agents/catalog)

## Start with what we can verify

The questions a brand asks now should be specific: under which conditions for which customer did the product enter the shortlist, how was it described, and where did any inaccurate information begin?

If recommendations increase, changes in actual inquiries and purchases must be checked separately. The fact that a model selected a product in an experiment is not enough to calculate a sales effect.

Instead of trying to discover how every AI system makes every choice, a brand can begin by describing accurately the information delivered about its products and the limits of the results it observed. Only then is there a sound basis for deciding what to improve next.

## References

1. Slobodan Manic. [Three AI Models Shopping Shopify's Catalog Picked Different Products](https://nohacks.co/blog/three-ai-models-picked-different-products). Original experiment, October 24, 2026. [Search Engine Journal republication](https://www.searchenginejournal.com/3-ai-models-shopped-shopifys-catalog-each-picked-a-different-winner/594298/), November 2, 2026.
2. Shopify Help Center. [Shopify Catalog](https://help.shopify.com/en/manual/shopify-catalog). Distinguishes product-data delivery from final appearance and ranking.
3. Shopify Help Center. [Shopify Catalog and product discovery for agentic storefronts](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products). Product-data fields and mapping.
4. Shopify Developers. [About Catalogs](https://shopify.dev/docs/agents/catalog). Inferred fields and catalog usage guidance.

Sources reviewed November 4, 2026. This article explains an external experiment alongside official documentation.

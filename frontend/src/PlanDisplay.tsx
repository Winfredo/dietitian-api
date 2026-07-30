import type { FoodItem, NutritionPlan } from "./types";

function FoodItemList({ items }: { items: FoodItem[] }) {
  if (items.length === 0) return <p className="empty">None noted.</p>;
  return (
    <ul>
      {items.map((item) => (
        <li key={item.item}>
          <strong>{item.item}</strong> — {item.reason}
          {item.relatedCondition ? ` (related to ${item.relatedCondition})` : ""}
        </li>
      ))}
    </ul>
  );
}

export function PlanDisplay({ plan }: { plan: NutritionPlan }) {
  return (
    <div className="plan-display">
      <h2>Your Nutrition Plan</h2>
      <p className="summary">{plan.summary}</p>

      <section>
        <h3>Foods to Avoid</h3>
        <FoodItemList items={plan.foodsToAvoid} />
      </section>

      <section>
        <h3>Nutrients to Limit</h3>
        <FoodItemList items={plan.nutrientsToLimit} />
      </section>

      <section>
        <h3>Foods to Eat</h3>
        <FoodItemList items={plan.foodsToEat} />
      </section>

      <section>
        <h3>Nutrients to Increase</h3>
        <FoodItemList items={plan.nutrientsToIncrease} />
      </section>

      <section>
        <h3>Health Tips</h3>
        <ul>
          {plan.healthTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <p className="plan-disclaimer">{plan.disclaimer}</p>
    </div>
  );
}

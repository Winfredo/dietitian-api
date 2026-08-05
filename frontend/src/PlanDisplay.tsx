import type { FoodItem, NutritionPlan } from "./types";

type CategoryTone = "danger" | "warning" | "success" | "info";

function FoodItemList({ items }: { items: FoodItem[] }) {
  if (items.length === 0) {
    return <p className="empty">None noted.</p>;
  }
  return (
    <ul className="food-list">
      {items.map((item) => (
        <li key={item.item} className="food-item">
          <span className="food-item-name">{item.item}</span>
          <span className="food-item-reason">{item.reason}</span>
          {item.relatedCondition && (
            <span className="food-item-tag">{item.relatedCondition}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function PlanSection({
  icon,
  title,
  tone,
  items,
}: {
  icon: string;
  title: string;
  tone: CategoryTone;
  items: FoodItem[];
}) {
  return (
    <section className={`plan-section tone-${tone}`}>
      <h3>
        <span className="plan-section-icon" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h3>
      <FoodItemList items={items} />
    </section>
  );
}

export function PlanDisplay({ plan }: { plan: NutritionPlan }) {
  return (
    <div className="plan-display">
      <div className="plan-header">
        <span className="plan-header-icon" aria-hidden="true">
          🎉
        </span>
        <div>
          <h2>Your Nutrition Plan</h2>
          <p className="summary">{plan.summary}</p>
        </div>
      </div>

      <div className="plan-grid">
        <PlanSection icon="🚫" title="Foods to Avoid" tone="danger" items={plan.foodsToAvoid} />
        <PlanSection icon="⚖️" title="Nutrients to Limit" tone="warning" items={plan.nutrientsToLimit} />
        <PlanSection icon="✅" title="Foods to Eat" tone="success" items={plan.foodsToEat} />
        <PlanSection icon="📈" title="Nutrients to Increase" tone="info" items={plan.nutrientsToIncrease} />
      </div>

      <section className="plan-tips">
        <h3>
          <span className="plan-section-icon" aria-hidden="true">
            💡
          </span>
          Health Tips
        </h3>
        <ul className="tips-list">
          {plan.healthTips.map((tip) => (
            <li key={tip}>
              <span className="tip-check" aria-hidden="true">
                ✓
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <p className="plan-disclaimer">{plan.disclaimer}</p>
    </div>
  );
}

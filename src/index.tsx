import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const FLASHCARD_ANSWER = { FORGOT: "FORGOT", HARD: "HARD", EASY: "EASY" };
const ANSWER_SPEED = {
  QUESTION_READ_TIME: 0,
  FAST: 1,
  MODERATE: 2,
  SLOW: 3,
  VERY_SLOW: 4,
  COULD_NOT_RECALL: 5,
};
const MEMORY_FRESHNESS = {
  EXCELLENT_RETENTION: "EXCELLENT_RETENTION",
  GOOD_RECALL: "GOOD_RECALL",
  MODERATE_RECALL: "MODERATE_RECALL",
  LOW_MEMORY: "LOW_MEMORY",
  HARD_RECALL: "HARD_RECALL",
};

const MIN_EFACTOR = 1.3;
const MAX_EFACTOR = 2.8;
const DAYS_MS = 86400000;

function getFreshness(r) {
  if (r > 0.9) return MEMORY_FRESHNESS.EXCELLENT_RETENTION;
  if (r > 0.7) return MEMORY_FRESHNESS.GOOD_RECALL;
  if (r > 0.5) return MEMORY_FRESHNESS.MODERATE_RECALL;
  if (r > 0.25) return MEMORY_FRESHNESS.LOW_MEMORY;
  return MEMORY_FRESHNESS.HARD_RECALL;
}

function getRandomEnumValue(enumObj) {
  const values = Object.values(enumObj);
  return values[Math.round(Math.random() * (values.length - 1))];
}

function updateReviewSchedule(card, quality, speed, now = Date.now()) {
  return _updateReviewSchedule(card, quality, speed, now);
}

function simulate(answers) {
  const history = [];
  let now = Date.now();
  let card = {
    dueDate: new Date(now),
    lastAnswer: new Date(now),
    memoryDays: 0,
    efactor: (MAX_EFACTOR - MIN_EFACTOR) / 2 + MIN_EFACTOR,
    repetitions: 0,
    total: 0,
  };

  let a = answers[0];
  var previous = {
    i: 0,
    dueDate: card.dueDate,
    lastAnswer: card.lastAnswer,
    memoryDays: card.memoryDays,
    efactor: card.efactor,
    repetitions: card.repetitions,
    freshness: MEMORY_FRESHNESS.HARD_RECALL,
    rChance: 0,
    quality: a.quality,
    speed: a.speed,
    daysLate: a.lateDays,
    total: card.total,
    newNow: now,
    totalDays: 0,
  };

  answers.forEach((a, i) => {
    const newNow = card.dueDate.getTime() + a.lateDays * DAYS_MS;
    const result = updateReviewSchedule(card, a.quality, a.speed, newNow);
    card = result.card;

    //debugger;
    history.push({
      i: i,
      dueDate: card.dueDate,
      lastAnswer: card.lastAnswer,
      memoryDays: card.memoryDays,
      efactor: card.efactor,
      repetitions: card.repetitions,
      freshness: result.freshness,
      rChance: result.rChance,
      quality: a.quality,
      speed: a.speed,
      daysLate: a.lateDays,
      total: card.total,
      previous: previous,
      newNow: newNow,
      totalDays: (newNow - now) / DAYS_MS,
    });
    previous = history[history.length - 1];
  });

  return history;
}

function App() {
  const [data, setData] = useState(simulateRandomAnswers());

  const handleSimulate = () => {
    setData(simulateRandomAnswers());
  };

  const freshnessColors = {
    EXCELLENT_RETENTION: "green",
    GOOD_RECALL: "blue",
    MODERATE_RECALL: "orange",
    LOW_MEMORY: "#FF80FF",
    HARD_RECALL: "red",
  };

  const answerColors = {
    EASY: "blue",
    HARD: "brown",
    FORGOT: "red",
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h3>Flashcard Review Simulator</h3>
      <button onClick={handleSimulate} style={{ marginBottom: 10 }}>
        Simulate Again (Random 20 Answers)
      </button>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="i" label={{ value: "Review #", position: "insideBottomRight" }} />
          <YAxis
            type="number"
            scale="log"
            domain={[0.1, 30]}
            label={{
              value: "Memory Days (log scale)",
              angle: -90,
              position: "insideLeft",
            }}
            tickFormatter={(value) => `${value}d`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const current = payload[0].payload;
              let previous = current.previous;
              debugger;
              return (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #ccc",
                    padding: 10,
                  }}
                >
                  <div>
                    <b>Review #{current.i + 1}</b>
                  </div>
                  <div style={{ color: answerColors[current.quality] }}>Answer: {current.quality}</div>
                  <div>Speed: {current.speed}</div>
                  <div>
                    Memory Days → {previous.memoryDays.toFixed(2)}d → {current.memoryDays.toFixed(2)}d
                  </div>
                  <div>
                    EFactor → {previous.efactor.toFixed(4)} → {current?.efactor?.toFixed(4)}
                  </div>
                  <div>
                    Reps → {previous.repetitions} → {current?.repetitions}
                  </div>
                  <div style={{ color: freshnessColors[current.freshness] }}>
                    Freshness → {previous.previous ? previous.freshness : current.freshness} → {current?.freshness}
                  </div>
                  <div>
                    Retrievability → {(previous.rChance * 100).toFixed(1)}% → {(current?.rChance * 100).toFixed(1)}%
                  </div>
                  <div>Overdue → {current.daysLate.toFixed(2)}d</div>
                  <div>TotalDays → {current.totalDays.toFixed(2)}d</div>
                  <div>
                    Total → {previous.total.toFixed(1)} → {current?.total?.toFixed(1)}
                  </div>
                  <div>Date → {current?.dueDate.toDateString()}</div>
                  <div>DaysBetween → {(current.lastAnswer.getTime() - current.previous.lastAnswer.getTime()) / DAYS_MS}</div>
                  <div>Passed → {(current.lastAnswer.getTime() - data[0].lastAnswer.getTime()) / DAYS_MS}</div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="memoryDays"
            stroke="#8884d8"
            dot={(props) => {
              const color = answerColors[props.payload.quality] || "#000";
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={1 + Math.log(props.payload.memoryDays) / Math.log(10)}
                  stroke="#000"
                  strokeWidth={1}
                  fill={color}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey={function (d) {
              return 1 + (d.lastAnswer.getTime() - data[0].lastAnswer.getTime()) / DAYS_MS;
            }}
            stroke="#8884d8"
            dot={(props) => {
              const color = answerColors[props.payload.quality] || "#000";
              return <circle cx={props.cx} cy={props.cy} r={6} stroke="#000" strokeWidth={1} fill={color} />;
            }}
          />
          lastAnswer
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="i" label={{ value: "Review #", position: "insideBottomRight" }} />
          <YAxis
            domain={[MIN_EFACTOR, MAX_EFACTOR]}
            scale="log"
            label={{
              value: "EFactor",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Line type="monotone" dataKey="efactor" stroke="#82ca9d" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="i"
            label={{
              value: "Days Late Review #",
              position: "insideBottomRight",
            }}
          />
          <YAxis
            domain={[0, 30]}
            label={{
              value: "Days Late",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Line type="monotone" dataKey="daysLate" stroke="#ff7300" dot={{ r: 3 }} />

          <Line
            type="monotone"
            //dataKey="totalDays"
            stroke="#ff7300"
            dataKey={(d) => d.totalDays /*Math.min(d.totalDays, 45)*/}
            dot={({ cx, cy, payload }) => {
              //debugger;
              //const value = Math.min(payload.totalDays, 50); // limit here
              return <circle cx={cx} cy={cy} r={3} fill="orange" />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      <ul style={{ fontSize: 14, marginTop: 10 }}>
        {data.map((d) => (
          <li key={d.i}>
            ##{d.i}: <span style={{ color: answerColors[d.quality] }}>Answer = {d.quality}</span>, Speed = {d.speed}, memoryDays ={" "}
            {d.memoryDays.toFixed(2)}, efactor = {d.efactor.toFixed(2)}, reps = {d.repetitions},{" "}
            <span style={{ color: freshnessColors[d.freshness] }}>
              freshness ={" "}
              <b>
                {d.freshness} (<u>{d.rChance.toFixed(2)}</u>)
              </b>
            </span>
            , daysLate = {d.daysLate.toFixed(2)}d,{" "}
          </li>
        ))}
      </ul>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

function simulateRandomAnswers(count = 20) {
  const answers = [];
  for (let i = 0; i < count; i++) {
    answers.push({
      quality: getRandomEnumValue(FLASHCARD_ANSWER),
      speed: getRandomEnumValue(ANSWER_SPEED),
      lateDays: Math.floor(Math.random() * 12), //Danilo
    });
  }
  return simulate(answers);
}

function _updateReviewSchedule(cardData, answerQuality, answerDelayQuality, now) {
  const minMemoryDaysForgot = 0.02;
  const maxDueIntervalOnForgot = 0.5;
  const maxDueIntervalEachRightAnswer = 5;
  const minMemoryDaysHard = 0.5;
  const minMemoryDaysEasy = 1;
  const minExpectedMemoryDays = 7;
  const linearGrowthLimit = 180;
  const maxMemoryDaysLimit = 360;

  let efactor = cardData.efactor;
  let memoryDays = Math.max(0, cardData.memoryDays);
  let repetitions = cardData.repetitions;
  let total = cardData.total;

  const daysSinceLastReview = (now - cardData.lastAnswer.getTime()) / DAYS_MS;
  const daysLate = Math.max(0, (now - cardData.dueDate.getTime()) / DAYS_MS);
  const daysOfMemoryYet = Math.max(0, memoryDays - daysSinceLastReview);

  let efactorDelta;
  switch (answerQuality) {
    case FLASHCARD_ANSWER.FORGOT:
    default:
      efactorDelta = -0.3;
      break;
    case FLASHCARD_ANSWER.HARD:
      efactorDelta =
        {
          [ANSWER_SPEED.QUESTION_READ_TIME]: 0.15,
          [ANSWER_SPEED.FAST]: 0.1,
          [ANSWER_SPEED.MODERATE]: 0.08,
          [ANSWER_SPEED.SLOW]: 0.06,
          [ANSWER_SPEED.VERY_SLOW]: 0.05,
          [ANSWER_SPEED.COULD_NOT_RECALL]: 0.03,
        }[answerDelayQuality] ?? 0;
      break;
    case FLASHCARD_ANSWER.EASY:
      efactorDelta =
        {
          [ANSWER_SPEED.QUESTION_READ_TIME]: 0.31,
          [ANSWER_SPEED.FAST]: 0.24,
          [ANSWER_SPEED.MODERATE]: 0.19,
          [ANSWER_SPEED.SLOW]: 0.14,
          [ANSWER_SPEED.VERY_SLOW]: 0.11,
          [ANSWER_SPEED.COULD_NOT_RECALL]: 0.4,
        }[answerDelayQuality] ?? 0;
      break;
  }
  efactor = Math.max(MIN_EFACTOR, efactor - daysLate * 0.001);

  const range = MAX_EFACTOR - MIN_EFACTOR;
  const closenessToMax = (MAX_EFACTOR - efactor) / range;
  const closenessToMin = (efactor - MIN_EFACTOR) / range;

  if (efactorDelta >= 0) {
    efactor += efactorDelta * closenessToMax;
  } else {
    efactor += efactorDelta * closenessToMin;
  }
  efactor = Math.min(MAX_EFACTOR, Math.max(MIN_EFACTOR, efactor));

  if (answerQuality === FLASHCARD_ANSWER.FORGOT) {
    const memoryDecay = Math.exp(-daysSinceLastReview / (memoryDays + 1));
    memoryDays = Math.max(minMemoryDaysForgot, memoryDays * (1 - 0.8 * memoryDecay)); //maior chance de acerto, mais precisa diminuir
    repetitions = 0;
  } else {
    const memoryDecay = Math.exp(-daysSinceLastReview / (memoryDays + 1));
    let linearGrowth = Math.max(
      (answerQuality === FLASHCARD_ANSWER.HARD ? minMemoryDaysHard : minMemoryDaysEasy) * efactor,
      memoryDays + Math.max(0, efactor * memoryDecay * memoryDays)
    );

    if (linearGrowth <= linearGrowthLimit) {
      memoryDays = linearGrowth;
    } else {
      const adjusted = linearGrowthLimit + Math.pow(linearGrowth - linearGrowthLimit + 1, 0.84); // +1 para evitar log(0)
      memoryDays = adjusted; //Math.min(adjusted, maxMemoryDaysLimit);
    }

    repetitions += 1;
  }

  let dueDateDelta = Math.min(memoryDays, maxDueIntervalOnForgot + repetitions * maxDueIntervalEachRightAnswer);

  const card = {
    dueDate: new Date(now + dueDateDelta * DAYS_MS),
    lastAnswer: new Date(now),
    memoryDays: memoryDays,
    efactor: efactor,
    repetitions: repetitions,
    total: total + 1,
  };
  const efactorPortion = (efactor - MIN_EFACTOR + 0.4) / (MAX_EFACTOR - MIN_EFACTOR);

  console.log(efactorPortion, daysOfMemoryYet, daysSinceLastReview, minExpectedMemoryDays, memoryDays);
  const base = Math.log(memoryDays + 1); // +1 avoids log(0)
  const maxBase = Math.log(maxMemoryDaysLimit + 1);
  const logPortion = base / maxBase; // grows slowly after the linear region
  const expectedRightAnswerChance = Math.min(1, 0.7 * logPortion + 0.4 * efactorPortion);

  const freshness = getFreshness(expectedRightAnswerChance);

  return {
    card: card,
    rChance: expectedRightAnswerChance,
    freshness: freshness,
    daysLate: daysSinceLastReview,
  };
}

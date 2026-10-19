# @habsum/habit-render

## Introduction

Habits are render-model-esque -- so the API response determins how they're rendered on the client.

Here's a samply API response for a "Push up" **`summation`** type of habit.

```JSON
{
    "name": "Push ups", // name displayed on habit card
    "type": "summation", // type of habit
    "ctaUrl": "/users/mac/habits/detail?filter=push-ups&date=2026-10-19",
    "details": {
        "goal": 100, // configured goal.
        "total": 23, // current count
        "summationOptions": { // summation type specific fields
            "manualInput": true, // enables the "+" button to allow users manually input numbers.
            "increments": [5, 10] // configured quick add options. Can be negative.
        }
    },
    "widgets": [{
        "title": "Goal", // widget section title
        "titleValue": "— / 100", // text that appears on the right hand side of the title
        "body": [{ // a list of visualization that appear under the "Goal" widget subheader
            "kind": "progress",  // a progress bar
            "value": 23,
            "max": 100
        }, /* more widget body visualization */ ]
    }],
}
```

## Widgets Body Visualizations

### Progress bar

```
{
    "kind": "progress",  // a progress bar
    "value": 23,
    "max": 100
}
```

### Progress bar

```JSON
{ "kind": "progress", "value": 23, "max": 100 }
```

### Insights

```JSON
{
    "kind": "insights",
    "insights": [{
        "header": "Current streak",
        "description": "0 days"
        "hover": "Some text"
    }],
}
```

### Bagraph

TODO

### Heatmap

TODO

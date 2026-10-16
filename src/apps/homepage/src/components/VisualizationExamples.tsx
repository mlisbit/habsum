// exclusive-bem-block: visualization-examples
import { BarGraph } from '@habsum/ui/components/graphs/BarGraph';
import { Heatmap } from '@habsum/ui/components/graphs/Heatmap';
import {
  barGraphData,
  dailyGoal,
  heatmapEntries,
  insightCards,
} from '../data/visualization-examples';
import InsightsExample from './InsightsExample';

export default function VisualizationExamples() {
  return (
    <div className="visualization-examples">
      <article
        className="visualization-examples__card"
        aria-label="Heatmap example using sample data"
      >
        <h3 className="text-h-l">Heatmaps</h3>
        <div className="visualization-examples__content">
          <Heatmap entries={heatmapEntries} />
        </div>
      </article>
      <article
        className="visualization-examples__card"
        aria-label="Bar graph example using sample data"
      >
        <h3 className="text-h-l">Bar graphs</h3>
        <div className="visualization-examples__content">
          <BarGraph
            className="visualization-examples__bar-graph"
            data={barGraphData}
            lines={[{ value: dailyGoal, label: `Daily goal: ${dailyGoal}` }]}
          />
        </div>
      </article>
      <article
        className="visualization-examples__card"
        aria-label="Insights example using sample data"
      >
        <h3 className="text-h-l">Insights</h3>
        <div className="visualization-examples__content">
          <InsightsExample cards={insightCards} />
        </div>
      </article>
    </div>
  );
}

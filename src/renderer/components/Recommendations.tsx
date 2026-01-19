import { FC } from 'react';
import { RecommendationState, Recommendation } from '../types';

interface RecommendationsProps {
  data: RecommendationState | null;
}

const ActivityCard: FC<{ recommendation: Recommendation }> = ({ recommendation }) => {
  const getActivityName = (activity: string): string => {
    switch (activity) {
      case 'ev_charging':
        return 'Charge EV';
      case 'laundry':
        return 'Laundry';
      default:
        return activity;
    }
  };

  const qualityClass = `activity-card quality-${recommendation.quality}`;

  return (
    <div className={qualityClass}>
      <span className="activity-icon">{recommendation.icon}</span>
      <span className="activity-name">{getActivityName(recommendation.activity)}</span>
      {recommendation.windowEnd && (
        <span className="activity-window">until {recommendation.windowEnd}</span>
      )}
    </div>
  );
};

const Recommendations: FC<RecommendationsProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="recommendations-container loading">
        <div className="recommendations-skeleton" />
      </div>
    );
  }

  const hasRecommendations = data.recommendations.length > 0;
  const statusIcon = data.overallStatus === 'go' ? '⚡' : data.overallStatus === 'okay' ? '👍' : '⏳';
  const statusClass = `recommendations-container status-${data.overallStatus}`;

  return (
    <div className={statusClass}>
      <div className="recommendations-header">
        <span className="recommendations-icon">{statusIcon}</span>
        <span className="recommendations-title">
          {hasRecommendations ? 'GOOD TIME NOW' : 'WAIT FOR BETTER TIME'}
        </span>
      </div>

      {hasRecommendations ? (
        <>
          <div className="recommendations-grid">
            {data.recommendations.map((rec, index) => (
              <ActivityCard key={index} recommendation={rec} />
            ))}
          </div>
          <div className="recommendations-reason">
            {data.recommendations[0]?.reason}
            {data.recommendations.length > 1 && ` + ${data.recommendations.length - 1} more`}
          </div>
        </>
      ) : (
        <div className="recommendations-wait">
          {data.nextWindow ? (
            <>
              <span className="next-window-label">Next window:</span>
              <span className="next-window-time">{data.nextWindow.time}</span>
              <span className="next-window-reason">{data.nextWindow.reason}</span>
            </>
          ) : (
            <span className="no-window">Check back later</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Recommendations;

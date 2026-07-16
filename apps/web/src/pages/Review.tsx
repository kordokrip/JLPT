import { ReviewView } from '../features/review/ReviewView';
import { useReview } from '../features/review/useReview';

export default function Review() {
  return <ReviewView {...useReview()} />;
}

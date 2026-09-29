import TournamentOverview from "../../components/TournamentOverview";
import TournamentManager from "../../../../components/dashboard/hanbee/TournamentManager";
import TournamentReviewQueue from "../../../../components/dashboard/hanbee/TournamentReviewQueue";
import TournamentResults from "../../../../components/dashboard/hanbee/TournamentResults";

export default function HanbeeTournamentPage() {
  return <div><TournamentOverview /><TournamentManager /><TournamentReviewQueue /><TournamentResults /></div>;
}

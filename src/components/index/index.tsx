import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Configuration from "../configuration";
import RefreshData from "../refresh-data";
import ChartDataLabels from "chartjs-plugin-datalabels";
import TotalValue from "../total-value";
import AssetChange from "../asset-change";
import LatestAssetsPercentage from "../latest-assets-percentage";
import CoinsAmountChange from "../coins-amount-change";
import TopCoinsRank from "../top-coins-rank";
import HistoricalData from "../historical-data";
import "./index.css";
import Select, { SelectOption } from "../common/select";

import "./index.css";
import {
  AssetChangeData,
  CoinsAmountChangeData,
  LatestAssetsPercentageData,
  TopCoinsRankData,
} from "../../middlelayers/types";
import { useEffect, useMemo, useState } from "react";
import { queryAssetChange } from "../../middlelayers/charts";
import { queryCoinsAmountChange } from "../../middlelayers/charts";
import { queryTopCoinsRank } from "../../middlelayers/charts";
import { queryTotalValue } from "../../middlelayers/charts";
import { queryLatestAssetsPercentage } from "../../middlelayers/charts";
import Loading from "../common/loading";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const App = () => {
  const [loading, setLoading] = useState(false);
  const [querySize, setQuerySize] = useState(10);
  const [latestAssetsPercentageData, setLatestAssetsPercentageData] = useState(
    [] as LatestAssetsPercentageData
  );
  const [assetChangeData, setAssetChangeData] = useState({
    timestamps: [],
    data: [],
  } as AssetChangeData);
  const [totalValueData, setTotalValueData] = useState({
    totalValue: 0,
    changePercentage: 0,
  });
  const [coinsAmountChangeData, setCoinsAmountChangeData] = useState(
    [] as CoinsAmountChangeData
  );
  const [topCoinsRankData, setTopCoinsRankData] = useState({
    timestamps: [],
    coins: [],
  } as TopCoinsRankData);

  const querySizeOptions = useMemo(
    () =>
      [
        {
          value: "10",
          label: "10",
        },
        {
          value: "20",
          label: "20",
        },
        {
          value: "50",
          label: "50",
        },
      ] as SelectOption[],
    []
  );

  useEffect(() => {
    loadAllData(querySize);
  }, [querySize]);

  async function loadAllDataAsync(size = 10) {
    console.log("loading all data... size: ", size);
    const tv = await queryTotalValue();
    setTotalValueData(tv);
    const lap = await queryLatestAssetsPercentage();
    setLatestAssetsPercentageData(lap);
    const ac = await queryAssetChange(size);
    setAssetChangeData(ac);
    const cac = await queryCoinsAmountChange(size);
    setCoinsAmountChangeData(cac);
    const tcr = await queryTopCoinsRank(size);
    setTopCoinsRankData(tcr);
  }

  function loadAllData(size = 10) {
    setLoading(true);
    // set a loading delay to show the loading animation
    setTimeout(() => {
      loadAllDataAsync(size).finally(() => setLoading(false));
    }, 200);
  }

  function onQuerySizeChanged(val: string) {
    setQuerySize(parseInt(val, 10));
  }

  return (
    <div>
      <Loading loading={loading} />
      <div className="top-left-buttons-wrapper">
        <div style={{ display: "inline-block" }}>
          <span
            style={{
              fontFamily: "BM Jua",
              fontWeight: "bold",
            }}
          >
            Size{" "}
          </span>
          <Select
            options={querySizeOptions}
            onSelectChange={onQuerySizeChanged}
          />
        </div>
      </div>
      <div className="top-right-buttons-wrapper">
        <div style={{ display: "inline-block" }}>
          <HistoricalData afterDataDeleted={() => loadAllData(querySize)} />
        </div>
        <div style={{ display: "inline-block" }}>
          <RefreshData afterRefresh={() => loadAllData(querySize)} />
        </div>
        <div style={{ display: "inline-block" }}>
          <Configuration />
        </div>
      </div>
      <div>
        <TotalValue data={totalValueData} />
        <LatestAssetsPercentage data={latestAssetsPercentageData} />
        <AssetChange data={assetChangeData} />
        <CoinsAmountChange data={coinsAmountChangeData} />
        <TopCoinsRank data={topCoinsRankData} />
      </div>
    </div>
  );
};

export default App;

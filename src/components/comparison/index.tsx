import { useEffect, useMemo, useState } from "react";
import "./index.css";
import { CoinData, CurrencyRateDetail } from "../../middlelayers/types";
import {
  queryAllDataDates,
  queryCoinDataById,
} from "../../middlelayers/charts";
import _ from "lodash";
import Select from "../common/select";
import viewIcon from "../../assets/icons/view-icon.png";
import hideIcon from "../../assets/icons/hide-icon.png";
import { currencyWrapper } from "../../utils/currency";
import { useWindowSize } from "../../utils/hook";
import { parseDateToTS } from "../../utils/date";

type ComparisonData = {
  name: string;
  base: number;
  head: number;
};

type QuickCompareType = "7D" | "1M" | "1Q" | "1Y";

const App = ({ currency }: { currency: CurrencyRateDetail }) => {
  const [baseId, setBaseId] = useState<string>("");
  const [dateOptions, setDateOptions] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);

  const [currentQuickCompare, setCurrentQuickCompare] =
    useState<QuickCompareType | null>(null);

  const windowSize = useWindowSize();

  const baseDate = useMemo(() => {
    return _.find(dateOptions, { value: "" + baseId })?.label;
  }, [dateOptions, baseId]);
  const [headId, setHeadId] = useState<string>("");
  const headDate = useMemo(() => {
    return _.find(dateOptions, { value: "" + headId })?.label;
  }, [dateOptions, headId]);

  const [baseData, setBaseData] = useState<CoinData[]>([]);
  const [headData, setHeadData] = useState<CoinData[]>([]);

  const [data, setData] = useState<ComparisonData[]>([]);

  const [showDetail, setShowDetail] = useState<boolean>(true);

  useEffect(() => {
    loadAllSelectDates().then((data) => {
      const options = _(data)
        .map((d) => ({
          label: d.date,
          value: "" + d.id,
        }))
        .value();

      // if headDate is not set, set it to the latest date
      if (!headDate && options.length > 0) {
        setHeadId(options[0].value);
      }

      // if baseDate is not set, set it to the second latest date
      if (!baseDate && options.length > 0) {
        setBaseId(options[1]?.value || options[0].value);
      }

      setDateOptions(options);
    });
  }, []);

  useEffect(() => {
    setData(loadData(baseData, headData));
  }, [baseData, headData]);

  useEffect(() => {
    if (!baseId) {
      return;
    }
    loadDataById(baseId).then((data) => setBaseData(data));
  }, [baseId]);

  useEffect(() => {
    if (!headId) {
      return;
    }
    loadDataById(headId).then((data) => setHeadData(data));
  }, [headId]);

  // update button style
  useEffect(() => {
    const buttons = document.getElementsByClassName("active");
    for (let i = 0; i < buttons.length; i++) {
      if (
        ["7D", "1M", "1Q", "1Y"]
          .map((i) => getQuickCompareWholeKey(i as QuickCompareType))
          .includes(buttons[i].id)
      ) {
        buttons[i].classList.remove("active");
      }
    }

    document
      .getElementById(
        getQuickCompareWholeKey(currentQuickCompare as QuickCompareType)
      )
      ?.classList.add("active");
  }, [currentQuickCompare]);

  // update quick compare data ( baseId and headId )
  useEffect(() => {
    if (!currentQuickCompare) {
      return;
    }

    // set headId to latest
    const latestDate = dateOptions[0];
    setHeadId(latestDate.value);

    // get days from QuickCompareType
    const days = parseDaysQuickCompareType(currentQuickCompare);
    const baseDate = new Date(
      parseDateToTS(latestDate.label) - days * 24 * 60 * 60 * 1000
    );

    // find the closest date
    const closestDate = _(dateOptions)
      .map((d) => ({
        ...d,
        diff: Math.abs(parseDateToTS(d.label) - baseDate.getTime()),
      }))
      .sortBy("diff")
      .first();

    if (!closestDate) {
      return;
    }
    setBaseId(closestDate?.value);
  }, [currentQuickCompare]);

  function parseDaysQuickCompareType(type: QuickCompareType): number {
    switch (type) {
      case "7D":
        return 7;
      case "1M":
        return 30;
      case "1Q":
        return 90;
      case "1Y":
        return 365;
      default:
        return 0;
    }
  }

  async function loadAllSelectDates(): Promise<
    {
      id: string;
      date: string;
    }[]
  > {
    return queryAllDataDates();
  }

  function onBaseSelectChange(id: string) {
    return onSelectChange(id, "base");
  }

  function onHeadSelectChange(id: string) {
    return onSelectChange(id, "head");
  }

  function onSelectChange(id: string, type: "base" | "head") {
    setCurrentQuickCompare(null);
    if (type === "base") {
      setBaseId(id);
    } else {
      setHeadId(id);
    }
  }

  function onViewOrHideClick() {
    setShowDetail(!showDetail);
  }

  function loadData(base: CoinData[], head: CoinData[]): ComparisonData[] {
    const res: ComparisonData[] = [];
    const symbols = _([...base, ...head])
      .map("symbol")
      .uniq()
      .value();

    const others = "Others";

    // add others to last
    symbols.sort((a, b) => {
      if (a === others) {
        return 1;
      }
      if (b === others) {
        return -1;
      }
      // origin order
      return 0;
    });

    // make total value and amount as the first two items
    const baseTotal = _(base).sumBy("value");
    const headTotal = _(head).sumBy("value");
    if (!_(symbols).isEmpty()) {
      res.push({
        name: "USD Total Value",
        base: baseTotal,
        head: headTotal,
      });
    }

    _(symbols).forEach((symbol) => {
      const baseItem = _.find(base, { symbol });
      const headItem = _.find(head, { symbol });

      res.push({
        name: symbol + " Value",
        base: baseItem?.value || 0,
        head: headItem?.value || 0,
      });

      if (symbol === others) {
        return;
      }

      res.push({
        name: symbol + " Amount",
        base: baseItem?.amount || 0,
        head: headItem?.amount || 0,
      });
      res.push({
        name: symbol + " Price",
        base: baseItem?.price || 0,
        head: headItem?.price || 0,
      });
    });

    return res;
  }

  async function loadDataById(id: string): Promise<CoinData[]> {
    // return queryCoinDataById(id);
    const data = await queryCoinDataById(id);
    const reversedData = _(data).sortBy("value").reverse().value();

    // only take first 10, and group others into others
    const others = "Others";
    const othersSymbols = _(reversedData).map("symbol").slice(10).value();
    const othersData = _(data)
      .filter((d) => othersSymbols.includes(d.symbol))
      .value();

    const res = [
      ..._(reversedData).take(10).value(),
      {
        symbol: others,
        value: _(othersData).sumBy("value"),
        amount: 0,
        price: 0,
      },
    ];

    return res;
  }

  function getComparisonResultNumber(base: number, head: number): number {
    if (!base || !head) return 0;
    return ((head - base) / base) * 100;
  }

  function prettyComparisonResult(base: number, head: number): string {
    const per = getComparisonResultNumber(base, head);

    if (per === 0) {
      return "-";
    }

    if (per > 0) {
      return "+" + prettyNumber(per, false) + "%";
    }

    return prettyNumber(per, false) + "%";
  }

  function prettyNumber(
    number: number,
    keepDecimal: boolean,
    showRealNumber = true,
    convertCurrency = false
  ): string {
    if (!showRealNumber) {
      return "***";
    }
    if (!number) {
      return "-";
    }
    let convertedNumber = number;
    if (convertCurrency) {
      convertedNumber = currencyWrapper(currency)(number);
    }
    let res = "" + convertedNumber;
    if (!keepDecimal) {
      res = convertedNumber.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (convertCurrency) {
      return `${currency.symbol} ${res}`;
    }
    return res;
  }

  function showColumnVal(
    item: ComparisonData,
    valType: "base" | "head"
  ): string {
    return prettyNumber(
      _(item).get(valType),
      item.name.includes("Amount") || item.name.includes("Price"),
      // don't hide price
      showDetail || item.name.includes("Price"),
      item.name.includes("Price") || item.name.includes("Value")
    );
  }

  function buttonGroupItemStyle() {
    return {
      height: 25,
      width: 40,
    };
  }

  function getQuickCompareWholeKey(type: QuickCompareType) {
    return "quick-compare-" + type;
  }

  function onQuickCompareButtonClick(type: QuickCompareType) {
    setCurrentQuickCompare(type);
  }

  return (
    <>
      <h1
        style={{
          display: "inline-block",
        }}
      >
        Comparison
      </h1>
      <a
        href="#"
        style={{
          marginLeft: 10,
        }}
        onClick={onViewOrHideClick}
      >
        <img
          src={showDetail ? viewIcon : hideIcon}
          alt="view-or-hide"
          width={25}
          height={25}
        />
      </a>

      <div id="comparison-container" className="comparison-container">
        <div
          style={{
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "inline-block",
              color: "gray",
              width: (windowSize.width ?? 0) * 0.8 - 190,
              fontSize: 15,
              overflow: "auto",
              textAlign: "right",
            }}
          >
            Quick Compare
          </div>
          <div
            className="button-group"
            style={{
              display: "inline-block",
              minWidth: "20%",
              float: "right",
            }}
          >
            <button
              id={getQuickCompareWholeKey("7D")}
              className="quick-compare-button"
              style={buttonGroupItemStyle()}
              onClick={() => onQuickCompareButtonClick("7D")}
            >
              7D
            </button>
            <button
              id={getQuickCompareWholeKey("1M")}
              className="quick-compare-button"
              style={buttonGroupItemStyle()}
              onClick={() => onQuickCompareButtonClick("1M")}
            >
              1M
            </button>
            <button
              id={getQuickCompareWholeKey("1Q")}
              className="quick-compare-button"
              style={buttonGroupItemStyle()}
              onClick={() => onQuickCompareButtonClick("1Q")}
            >
              1Q
            </button>
            <button
              id={getQuickCompareWholeKey("1Y")}
              className="quick-compare-button"
              style={buttonGroupItemStyle()}
              onClick={() => onQuickCompareButtonClick("1Y")}
            >
              1Y
            </button>
          </div>
        </div>
        <div className="comparison-date-picker">
          <div className="comparison-date-picker-item">
            <Select
              options={dateOptions}
              onSelectChange={(v) => onBaseSelectChange(v)}
              value={"" + baseId}
              width={150}
            />
          </div>
          <div className="comparison-date-picker-item">
            <Select
              options={dateOptions}
              onSelectChange={(v) => onHeadSelectChange(v)}
              value={"" + headId}
              width={150}
            />
          </div>
        </div>
        {_(data).isEmpty() ? (
          "No Data"
        ) : (
          <div
            className="comparison-row"
            style={{
              fontWeight: "bold",
              color: "#ededed",
              fontSize: Math.min(18, windowSize.width! / 35) + "px",
              backgroundColor: "#777777",
            }}
          >
            <div
              className="comparison-column"
              style={{
                width: "20%",
              }}
            >
              Name
            </div>
            <div className="comparison-column">{baseDate}</div>
            <div
              className="comparison-column"
              style={{
                maxWidth: "200px",
              }}
            >
              Difference
            </div>
            <div className="comparison-column">{headDate}</div>
          </div>
        )}
        {data.map((item, index) => (
          <div className="comparison-row" key={"comparison" + index}>
            <div
              className="comparison-column"
              style={{
                width: "20%",
              }}
            >
              {item.name}
            </div>
            <div
              className="comparison-column"
              title={showColumnVal(item, "base")}
            >
              {showColumnVal(item, "base")}
            </div>
            <div
              className="comparison-column"
              style={{
                color:
                  getComparisonResultNumber(item.base, item.head) === 0
                    ? ""
                    : getComparisonResultNumber(item.base, item.head) > 0
                    ? "green"
                    : "red",
                maxWidth: "200px",
              }}
              title={prettyComparisonResult(item.base, item.head)}
            >
              {prettyComparisonResult(item.base, item.head)}
            </div>
            <div
              className="comparison-column"
              title={showColumnVal(item, "head")}
            >
              {showColumnVal(item, "head")}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default App;

// main.js – D3 Strategy Bar Chart with Dropdown Interaction

// Size + margins
const margin = { top: 20, right: 30, bottom: 40, left: 180 };
const width  = 800 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

// Attach SVG to #chart
const svg = d3.select("#chart")
  .append("svg")
  .attr("width",  width  + margin.left + margin.right)
  .attr("height", height + margin.top  + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#tooltip");

// Metric options
const metrics = {
  sharpe: {
    label: "Average Sharpe Ratio",
    accessor: d => d["Sharpe Ratio (Since Inception)"],
    format: d3.format(".2f")
  },
  return: {
    label: "Average Annualized Return (%)",
    accessor: d => d["Annualized Returns (Since Inception)"],
    format: d3.format(".2f")
  },
  vol: {
    label: "Average Annualized Volatility (%)",
    accessor: d => d["Annualized Standard Deviation (Since Inception)"],
    format: d3.format(".2f")
  }
};

let currentMetricKey = "sharpe";

// Load CSV (keep in root folder)
d3.csv("my_dataframe_with_index.csv", d3.autoType).then(data => {

  // Group by strategy
  const grouped = d3.group(data, d => d["Primary Strategy"]);

  // Aggregate helper
  function aggregateByMetric(metricKey) {
    const acc = metrics[metricKey].accessor;
    const rows = [];

    for (const [strategy, values] of grouped.entries()) {
      const vals = values
        .map(acc)
        .filter(v => !Number.isNaN(v) && v != null);

      if (vals.length > 0) {
        rows.push({
          strategy,
          value: d3.mean(vals)
        });
      }
    }
    rows.sort((a, b) => d3.descending(a.value, b.value));
    return rows;
  }

  let aggData = aggregateByMetric(currentMetricKey);

  // Scales
  const y = d3.scaleBand()
    .domain(aggData.map(d => d.strategy))
    .range([0, height])
    .padding(0.15);

  const x = d3.scaleLinear().range([0, width]);

  // Axis groups
  const xAxisGroup = svg.append("g")
    .attr("transform", `translate(0,${height})`);
  const yAxisGroup = svg.append("g");

  // Axis label
  const xLabel = svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(metrics[currentMetricKey].label);

  // Update chart when metric switches
  function updateChart(data) {
    y.domain(data.map(d => d.strategy));
    const maxVal = d3.max(data, d => d.value);
    x.domain([Math.min(0, d3.min(data, d => d.value)), maxVal * 1.1]);

    const bars = svg.selectAll(".bar")
      .data(data, d => d.strategy);

    bars.exit().remove();

    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", d => y(d.strategy))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", 0)
      .attr("fill","#4c78a8")
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`<strong>${d.strategy}</strong><br>${metrics[currentMetricKey].label}: ${metrics[currentMetricKey].format(d.value)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 20) + "px");
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top",  (event.pageY - 20) + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0))
      .merge(bars)
      .transition()
      .duration(600)
      .attr("fill", "#4c78a8")
      .attr("y", d => y(d.strategy))
      .attr("height", y.bandwidth())
      .attr("x", d => Math.min(0, x(d.value)))
      .attr("width", d => Math.abs(x(d.value) - x(0)));

    xAxisGroup.transition().duration(600)
      .call(d3.axisBottom(x).ticks(6));

    yAxisGroup.transition().duration(600)
      .call(d3.axisLeft(y));

    xLabel.text(metrics[currentMetricKey].label);
  }

  updateChart(aggData);

  // Dropdown listener
  d3.select("#metric-select").on("change", event => {
    currentMetricKey = event.target.value;
    const newAgg = aggregateByMetric(currentMetricKey);
    updateChart(newAgg);
  });
});

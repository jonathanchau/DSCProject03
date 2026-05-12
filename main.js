const data = await d3.json("data/project_data.json");

const frames = data.frames;
const metrics = data.metrics.map(d => ({
  ...d,
  frame: +d.frame,
  intensity_proxy: +d.intensity_proxy,
  min_cloud_top_temp_k: +d.min_cloud_top_temp_k,
  mean_cloud_top_temp_k: +d.mean_cloud_top_temp_k,
  cold_cloud_fraction: +d.cold_cloud_fraction,
  date: new Date(d.time)
}));

let currentFrame = 0;
let playing = false;
let timer = null;

const image = d3.select("#storm-frame");
const slider = d3.select("#time-slider");
const timeLabel = d3.select("#time-label");
const playButton = d3.select("#play-button");

slider.attr("max", frames.length - 1);

function formatTime(timeString) {
  const date = new Date(timeString);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateFrame(frameIndex) {
  currentFrame = frameIndex;

  const frame = frames[currentFrame];

  image.attr("src", frame.file);
  slider.property("value", currentFrame);
  timeLabel.text(formatTime(frame.time));

  updateChartMarker(currentFrame);
}

slider.on("input", function () {
  updateFrame(+this.value);
});

playButton.on("click", function () {
  playing = !playing;

  if (playing) {
    playButton.text("Pause");

    timer = setInterval(() => {
      const nextFrame = (currentFrame + 1) % frames.length;
      updateFrame(nextFrame);
    }, 500);
  } else {
    playButton.text("Play");
    clearInterval(timer);
  }
});

// ---------- Line chart ----------

const margin = { top: 30, right: 30, bottom: 50, left: 70 };
const width = 520 - margin.left - margin.right;
const height = 360 - margin.top - margin.bottom;

const svg = d3.select("#line-chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear()
  .domain(d3.extent(metrics, d => d.frame))
  .range([0, width]);

const y = d3.scaleLinear()
  .domain([0, d3.max(metrics, d => d.intensity_proxy)])
  .nice()
  .range([height, 0]);

const line = d3.line()
  .x(d => x(d.frame))
  .y(d => y(d.intensity_proxy));

svg.append("path")
  .datum(metrics)
  .attr("class", "intensity-line")
  .attr("d", line);

svg.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(x).ticks(5));

svg.append("g")
  .call(d3.axisLeft(y));

svg.append("text")
  .attr("x", width / 2)
  .attr("y", height + 40)
  .attr("text-anchor", "middle")
  .text("Frame / Time Step");

svg.append("text")
  .attr("x", -height / 2)
  .attr("y", -50)
  .attr("transform", "rotate(-90)")
  .attr("text-anchor", "middle")
  .text("Intensity Proxy");

const marker = svg.append("circle")
  .attr("class", "frame-marker")
  .attr("r", 6);

function updateChartMarker(frameIndex) {
  const metric = metrics.find(d => d.frame === frameIndex);

  if (!metric) return;

  marker
    .attr("cx", x(metric.frame))
    .attr("cy", y(metric.intensity_proxy));
}

// Initialize
updateFrame(0);
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
    }, 1500);
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
  .attr("fill", "none")
  .attr("stroke", "#007bff") 
  .attr("stroke-width", 2)
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

  svg.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", y(5.8)) 
    .attr("y2", y(5.8))
    .attr("stroke", "red")
    .attr("stroke-dasharray", "5,5")
    .attr("stroke-width", 2)
    .style("opacity", 0.5);

  svg.append("text")
    .attr("x", width)
    .attr("y", y(5.8) - 5)
    .attr("text-anchor", "end")
    .attr("fill", "red")
    .style("font-size", "10px")
    .text("Rapid Intensification Threshold");

const marker = svg.append("circle")
  .attr("class", "frame-marker")
  .attr("r", 6);

function updateChartMarker(frameIndex) {
  const metric = metrics.find(d => d.frame === frameIndex);

  if (!metric) return;
  marker
    .attr("cx", x(metric.frame))
    .attr("cy", y(metric.intensity_proxy));

  d3.select("#val-temp").text(metric.mean_cloud_top_temp_k.toFixed(1));
  d3.select("#val-energy").text(metric.min_cloud_top_temp_k.toFixed(1));
  d3.select("#val-struct").text((metric.cold_cloud_fraction * 100).toFixed(1));

  const phaseTitle = d3.select("#phase-title");
  const phaseDesc = d3.select("#phase-desc");

  if (metric.intensity_proxy < 5.2) {
      phaseTitle.text("Phase 1: Fighting Wind Shear (Stalled)").style("color", "#5bc0de");
      phaseDesc.html(`
          <strong>Why is it stalling?</strong> Early in development, updrafts are fragile. Even over warm water, high-altitude winds (wind shear) can blow the tops off the clouds. <br><br>
          <strong>The Physics:</strong> Because the storm is tilted, the latent heat being released by the clouds doesn't stack vertically over the surface center. Without a vertically aligned "chimney," surface pressure cannot drop, and the storm stalls.
      `);
  } else if (metric.intensity_proxy < 5.9) {
      phaseTitle.text("Phase 2: Convective Burst & Vortex Alignment").style("color", "#f0ad4e");
      phaseDesc.html(`
          <strong>Why the sudden change?</strong> Notice the Convective Energy (Min Temp) dropping. The storm is experiencing a massive, concentrated burst of deep convection.<br><br>
          <strong>The Physics:</strong> This localized burst releases enough latent heat to establish a dominant updraft, overcoming the wind shear. The mid-level circulation and surface circulation finally align vertically. This is the critical turning point for hurricane formation.
      `);
  } else {
      phaseTitle.text("Phase 3: Rapid Intensification (RI)").style("color", "#d9534f");
      phaseDesc.html(`
          <strong>How is it intensifying?</strong> Look at the Core Structure (Cold Fraction) hitting its peak. The scattered clouds have merged into a Central Dense Overcast (CDO).<br><br>
          <strong>The Physics:</strong> With a vertically aligned vortex and a massive, symmetrical shield of cold clouds, the storm operates like a perfect thermodynamic engine. It is efficiently venting exhaust out the top, causing surface pressure to plummet and wind speeds to exponentially increase.
      `);
  }
}
// Initialize
updateFrame(0);

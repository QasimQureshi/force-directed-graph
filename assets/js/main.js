var width = 800,
    height = 600,
    color = d3.scaleOrdinal(d3.schemeCategory10),
    vis,
    nodesArr,
    nodesArr,// Array of all nodes
    linksArr,// Array of link data
    selectedNodes = [], // Randomly selected nodes
    selectedLinks = [], // Link data for selectedNodes
    chart = d3.select('#vis > svg');

// Resizing the D3 root SVG, when the window's dimensions change
d3.select(window).on("resize", function() {
  console.log('resize is called');

  var targetWidth = chart.node().getBoundingClientRect().width;
  chart.attr("width", targetWidth);
  chart.attr("height", targetWidth / aspect);
  w = innerWidth,
  h = innerHeight;
});

// Workaround to load images hosted on GitHub pages
if( document.location.href.indexOf('github') !== -1 )
  document.querySelector('body').style.backgroundImage = "url('https://raw.githubusercontent.com/QasimQureshi/force-directed-graph/master/assets/images/background_004.png')";

// d3.json("/assets/js/json/miserables.json").then(function(graph) {
d3.json("/assets/js/json/data.json").then(function(graph) {

  nodesArr = graph.record;
  graph.links = [];

  // Bugfix for D3, making node IDs 0-indexed rather than 1, as per https://stackoverflow.com/a/38913109/1290849
  // Essentially, D3 requires 0-indexed nodes for links to work. the data this function recieves starts from 1, which throws the length of the array off
  nodesArr.map( node => {
    node.id = node.id - 1;
    node.group = 1;
    // Decrementing related-node IDs
    node.related = node.related.map( relatedNodeID => {
      return relatedNodeID - 1;
    })
  })

  selectedNodes = nodesArr.map((x) => x).splice(0,10); // shallow-copying before splicing, to not remove nodes from nodesArr[]
  graph.nodes = selectedNodes;

var label = {
    'nodes': [],
    'links': []
};

// graph.nodes.forEach(function(d, i) {
selectedNodes.forEach(function(d, i) {
    label.nodes.push({node: d});
    label.nodes.push({node: d});
    // label.links.push({
    //     source: i * 2,
    //     target: i * 2 + 1
    // });
});

var labelLayout = d3.forceSimulation(label.nodes)
    .force("charge", d3.forceManyBody().strength(-50))
    .force("link", d3.forceLink(label.links).distance(0).strength(2));

var graphLayout = d3.forceSimulation(graph.nodes)
    .force("charge", d3.forceManyBody().strength(-3000))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(1))
    .force("y", d3.forceY(height / 2).strength(1))
    .force("link", d3.forceLink(graph.links).id(function(d) {return d.id; }).distance(50).strength(1))
    .on("tick", ticked);

var adjlist = [];

graph.links.forEach(function(d) {
    adjlist[d.source.index + "-" + d.target.index] = true;
    adjlist[d.target.index + "-" + d.source.index] = true;
});


var svg = d3.select("#viz").attr("width", width).attr("height", height);
var container = svg.append("g");

svg.call(
    d3.zoom()
        .scaleExtent([.1, 4])
        .on("zoom", function() { container.attr("transform", d3.event.transform); })
);

var link = container.append("g").attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter()
    .append("line")
    .attr("stroke", "#aaa")
    .attr("stroke-width", "1px");

var node = container.append("g").attr("class", "nodes")
    .selectAll("g")
    .data(graph.nodes)
    .enter()
    .append("circle")
    .attr("r", 5)
    .attr("fill", function(d) { return color(d.group); })

// node.on("mouseover", focus).on("mouseout", unfocus);

node.call(
    d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
);

var labelNode = container.append("g").attr("class", "labelNodes")
    .selectAll("text")
    .data(label.nodes)
    .enter()
    .append("text")
    .text(function(d, i) { return i % 2 == 0 ? "" : d.node.id; })
    .style("fill", "#555")
    .style("font-family", "Arial")
    .style("font-size", 12)
    .style("pointer-events", "none"); // to prevent mouseover/drag capture

// Append images asdf
// imageBasePath workaround to load images on GitHub pages
  var imageBasePath = (document.location.href.indexOf('github') === -1 ? '/assets/images' : 'https://raw.githubusercontent.com/QasimQureshi/force-directed-graph/master/assets/images');
  var images = container.append("svg:image")
        // ternary operator checks to ensure this node has an image
        .attr("xlink:href",  function(d) { return !!d.image ? imageBasePath + '/doodles-100px/' + d.image.url.substr(d.image.url.lastIndexOf('/') + 1) : null;})
        .attr("x", function(d) { return -30;})
        .attr("y", function(d) { return -30;})
        .attr("height", 60)
        .attr("width", 60);


function ticked() {

    node.call(updateNode);
    link.call(updateLink);

    labelLayout.alphaTarget(0.3).restart();
    labelNode.each(function(d, i) {
        if(i % 2 == 0) {
            d.x = d.node.x;
            d.y = d.node.y;
        } else {
            var b = this.getBBox();

            var diffX = d.x - d.node.x;
            var diffY = d.y - d.node.y;

            var dist = Math.sqrt(diffX * diffX + diffY * diffY);

            var shiftX = b.width * (diffX - dist) / (dist * 2);
            shiftX = Math.max(-b.width, Math.min(0, shiftX));
            var shiftY = 16;
            this.setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
        }
    });
    labelNode.call(updateNode);

}

function fixna(x) {
    if (isFinite(x)) return x;
    return 0;
}

// function neigh(a, b) {
//     return a == b || adjlist[a + "-" + b];
// }

// function focus(d) {
//     var index = d3.select(d3.event.target).datum().index;
//     node.style("opacity", function(o) {
//         return neigh(index, o.index) ? 1 : 0.1;
//     });
//     labelNode.attr("display", function(o) {
//       return neigh(index, o.node.index) ? "block": "none";
//     });
//     link.style("opacity", function(o) {
//         return o.source.index == index || o.target.index == index ? 1 : 0.1;
//     });
// }

// function unfocus() {
//    labelNode.attr("display", "block");
//    node.style("opacity", 1);
//    link.style("opacity", 1);
// }

function updateLink(link) {
    link.attr("x1", function(d) { return fixna(d.source.x); })
        .attr("y1", function(d) { return fixna(d.source.y); })
        .attr("x2", function(d) { return fixna(d.target.x); })
        .attr("y2", function(d) { return fixna(d.target.y); });
}

function updateNode(node) {
    node.attr("transform", function(d) {
        return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
    });
}

function dragstarted(d) {
    d3.event.sourceEvent.stopPropagation();
    if (!d3.event.active) graphLayout.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) graphLayout.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

}); // d3.json
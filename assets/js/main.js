// some colour variables
  // var tcBlack = "#130C0E";
  var tcBlack = "#808080";

// rest of vars
var w = innerWidth,
    h = innerHeight,
    maxNodeSize = 50,
    x_browser = 20,
    y_browser = 25,
    isFocusLocked = false,  // Set to true when we're moving a node to the center & selecting it
    clickedNode, // Points to the node that was clicked
    root,
    path,    // All the paths connecting nodes
    node,    // Array of all nodes
    nodeIDs; // Array of all IDs (used to determine which links to form)

// Workaround to load images on GitHub pages
  if( document.location.href.indexOf('github') !== -1 )
  {
    document.querySelector('body').style.backgroundImage = "url('https://raw.githubusercontent.com/QasimQureshi/force-directed-graph/master/assets/images/background_004.png')"
  }
 
var vis; // points to our container element
var force = d3.layout.force();  // D3's force layoud

vis = d3.select("#vis").append("svg").attr("width", innerWidth).attr("height", innerHeight);

d3.json("assets/js/json/data-v2.json", function(json) { 
// d3.json("assets/js/marvel.json", function(json) {
 
  root = json;
  root.fixed = true;
  root.x = w / 2;
  root.y = h / 4;
 
 
  // Build the path
  var defs = vis.insert("svg:defs")
      .data(["end"]);
 
 
  defs.enter().append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");
 
  update();
});

var aspect = innerWidth / innerHeight,
    chart = d3.select('#vis > svg');
d3.select(window)
  .on("resize", function() {
    console.log('resize is called');
    var targetWidth = chart.node().getBoundingClientRect().width;
    chart.attr("width", targetWidth);
    chart.attr("height", targetWidth / aspect);
    w = innerWidth,
    h = innerHeight;
  });
 
 
/**
 *   
 */
function update() {
  var nodes = flatten(root);
  var links = d3.layout.tree().links(nodes);
 
  
  // Restart the force layout.
  force.nodes(nodes)
    .links(links)
    .gravity(0.05)
    .charge(-1500)
    .linkDistance(100)
    .friction(0.5)
    .linkStrength(function(l, i) {return 1; })
    .size([w, h])
    .on("tick", tick)
        .start();
 
   path = vis.selectAll("path.link")
      .data(links, function(d) { return d.target.id; });
 
    path.enter().insert("svg:path")
      .attr("class", "link")
      .style("stroke", "#eee");
 
 
  // Exit any old paths.
  path.exit().remove();
 
 
  // Update the nodes…
  node = vis.selectAll("g.node")
      .data(nodes, function(d) { return d.id; });
 
 
  // Enter any new nodes.
  var nodeEnter = node.enter().append("svg:g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .on("click", click)
      .call(force.drag);
 
  // Append a circle
  nodeEnter.append("svg:circle")
      .attr("r", function(d) { return Math.sqrt(d.size) / 10 || 4.5; })
      .style("fill", "#eee");
 
   
  // Append images
  // Workaround to load images on GitHub pages
  var imageBasePath = (document.location.href.indexOf('github') === -1 ? '/assets/images/doodles-100px/' : 'https://raw.githubusercontent.com/QasimQureshi/force-directed-graph/master/assets/images/doodles-100px/');
  var images = nodeEnter.append("svg:image")
        // ternary operator checks to ensure this node has an image
        .attr("xlink:href",  function(d) { return !!d.image ? imageBasePath + d.image.url.substr(d.image.url.lastIndexOf('/') + 1) : null;})
        .attr("x", function(d) { return -25;})
        .attr("y", function(d) { return -25;})
        .attr("height", 50)
        .attr("width", 50);
  
  // make the image grow a little on mouse over and add the text details on click
  var setEvents = images
          .on( 'mouseenter', function() {
            // select element in current context
            d3.select( this )
              .transition()
              .attr("x", function(d) { return -35;})
              .attr("y", function(d) { return -35;})
              .attr("height", 70)
              .attr("width", 70);
          })
          // set back
          .on( 'mouseleave', function() {
            d3.select( this )
              .transition()
              .attr("x", function(d) { return -25;})
              .attr("y", function(d) { return -25;})
              .attr("height", 50)
              .attr("width", 50);
          });

  // Appending details on roll over next to the node as well
  nodeEnter.append("text")
      .attr("class", "nodetext")
      .on( 'click', linkClickHandler)
      .attr('text-anchor', 'middle')
      .attr("x", x_browser)
      .attr("y", y_browser +15)
      .attr("fill", tcBlack)
      .text(function(d) { return d.title; })
      .call(getBB);

      // var textNode = node.filter(function(d) {return (!d.image)});
      // 

  // Adding a background behind link labels
  d3.selectAll('g.node')
      .insert('rect', 'text')
      .attr('class', 'textRect')
      .attr('width', function(d){ return d.bbox.width + 10 })
      .attr('height', function(d){ return d.bbox.height + 5 })
      .attr('x', function(d){ return d.bbox.x - 5})
      .attr('y', function(d){return d.bbox.y - 2})
      .style('fill', '#ffffb9')
      .style('stroke', '#ccc')
      .on( 'click', linkClickHandler);


  // Opens the URL
  function linkClickHandler(d) {
    window.location = d.link.url;
  }

  // Returns a bounding box - used to draw rectangles behind text labels, when a node is hovered upon
  function getBB(selection){
    selection.each(function(d){
      d.bbox = this.getBBox();
    })
  }
 
 
  // Exit any old nodes.
  node.exit().remove();
 
 
  // Re-select for update.
  path = vis.selectAll("path.link");
  node = vis.selectAll("g.node");

// Moving the node to the center  
          // d3.select( this.closest('.node') )

  node.on('dragenter', e => {console.log(`${e.target} is dragged`)});
  // Node click handler
  node.on('click', function(d){
    
    var targetX = w / 2,
        targetY = h / 2,
        divisor = 16,
        dx,
        dy;

    function step(timestamp){
      console.log('step called');

      dx = targetX - d.x,
      dy = targetY - d.y;
      d.x += dx / divisor;
      d.y += dy / divisor;
      d.px = d.x;
      d.py = d.y;
      tick();
      
      
      if(Math.abs(dx) > 2 && Math.abs(dy) > 2)
      {
        window.requestAnimationFrame(step);
      }else{
        // Animation complete
        d.x = targetX;
        d.y = targetY;
        d.px = d.x;
        d.py = d.y;
        tick();
      }
      
    }

    window.requestAnimationFrame(step);

    // node.attr("link", function(na){

    // })
    // d.x = w / 2, 
    // d.y = h / 2,
    // d.px = d.x,
    // d.py = d.y,
    // d.fixed = true;
    // tick();

    // 
    // d3.select(this)
    //   .transition()
    //   .attr('x', function(d){  return ( w / 2)})
    //   .attr('y', function(d){ return ( h / 2)})
    //   .attr('px', function(d){  return ( w / 2)})
    //   .attr('py', function(d){ return ( h / 2)})

    // d.x = w / 2, 
    // d.y = h / 2,
    // d.px = d.x,
    // d.py = d.y,
    // d.fixed = true;
    // tick();

    // clickedNode = d;
    //       isFocusLocked = true;
          
    //       // Moving the node to the center  
    //       d3.select( this.closest('.node') )
    //           // .transition()
    //           // .attr("x", function(d) {  return (- window.innerWidth / 2) + this.getBBox().width })
    //           // .attr("y", function(d) { return h / 2;})

  })
 

  console.log('update is called');
}// Update function ends

// The basic enterFrame function
function tick() {

  // if(!isFocusLocked)
  // {

    path.attr("d", function(d) {
        
      var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy);

      var val = "M" + d.source.x + "," 
                + d.source.y 
                + "L" + d.target.x + "," 
                + d.target.y;

      // 
      return val;
    });

    node.attr("transform", nodeTransform);
  // }else{
  //   
  // }
  
}

 
/**
 * Gives the coordinates of the border for keeping the nodes inside a frame
 * http://bl.ocks.org/mbostock/1129492
 */ 
function nodeTransform(d) {
  if(!d.clicked)
  {
    d.x =  Math.max(maxNodeSize, Math.min(w - (d.imgwidth/8 || 16), d.x));
    d.y =  Math.max(maxNodeSize, Math.min(h - (d.imgheight/8 || 16), d.y));
    
  }else{
    
  }
  return "translate(" + d.x + "," + d.y + ")";
}
 
/**
 * Toggle children on click.
 */ 
function click(d) {
  // if (d.children) {
  //   d._children = d.children;
  //   d.children = null;
  // } else {
  //   d.children = d._children;
  //   d._children = null;
  // }
 
  // update();
}
 
 
/**
 * Returns a list of all nodes under the root. asdf
 */ 
function flatten(root) {

  var nodes = root.record,
      nodeIDs = nodes.map(node => node.id);

  // Using for instead of forEach, to access nodes & nodeIDs in the scope
  for(var i = 0; i < nodes.length; i++){
    let relatedNodeIDs = nodes[i].related.split(',').filter(id => nodeIDs.includes(id));
    nodes[i].children = nodes.filter(node => relatedNodeIDs.includes(node.id));
  }

  return nodes;
}


// Returns IDs of nodes currently active
function getActiveNodeIDs(){

}



// function flatten(root) {
//   var nodes = []; 
//   var i = 0;
 
//   function recurse(node) {
//     if (node.children) 
//       node.children.forEach(recurse);
//     if (!node.id) 
//       node.id = ++i;
//     nodes.push(node);
//   }
 
//   recurse(root);
//   
//   return nodes;
// }
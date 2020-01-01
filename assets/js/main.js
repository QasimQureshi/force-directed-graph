// some colour variables
  // var tcBlack = "#130C0E";
  var tcBlack = "#808080";

// rest of vars
var w = innerWidth,
    h = innerHeight,
    maxNodeSize = 50,
    maxNodesToAdd = 5, // The maximum number of children to add in one go
    x_browser = 20, // SVG element's positioning
    y_browser = 25,
    isFocusLocked = false,  // Set to true when we're moving a node to the center & selecting it
    clickedNode, // Points to the node that was clicked
    root,
    maxNodeNum = Math.floor(10 + Math.random() * 10), // Number of nodes to render onscreen. Random between 20 - 50
    path,    // All the paths connecting nodes
    nodesArr,// Array of all nodes
    linksArr,// Array of link data
    selectedNodes = [], // Randomly selected nodes
    selectedLinks = [], // Link data for selectedNodes
    node,    // Points to current SVG DOM selection, for D3 operations
    nodeIDs; // Array of all IDs (used to determine which links to form)

// Workaround to load images on GitHub pages
  if( document.location.href.indexOf('github') !== -1 )
  {
    document.querySelector('body').style.backgroundImage = "url('https://raw.githubusercontent.com/QasimQureshi/force-directed-graph/master/assets/images/background_004.png')"
  }
 
var vis; // points to our container element
var force = d3.layout.force();  // D3's force layoud

vis = d3.select("#vis").append("svg").attr("width", innerWidth).attr("height", innerHeight);

d3.json("assets/js/json/data.json", function(json) {

  // Randomly selecting values from graph.json to render onscreen
  nodesArr = json.record;

  // Bugfix for D3, as per https://stackoverflow.com/a/38913109/1290849
  // Essentially, D3 requires 0-indexed nodes for links to work. the data this function recieves starts from 1, which throws the length of the array off
  nodesArr.map( node => {
    node.id = node.id - 1;

    node.related = node.related.map( relatedNodeID => {
      return relatedNodeID - 1;
    })
  })
  // linksArr = json.links;

  // Copying nodesArr to be able to randomly splice & remove nodes non-destructively
  var nodesArrDup = nodesArr.map((x) => x), 
      randomNodeIndex,
      randomNode;

  // Picking up random nodes, and populating their children
  // for (var i = 0; i < maxNodeNum; i++)
  // {
  //   randomNodeIndex = Math.floor(Math.random() * nodesArrDup.length); // Random index, within range
  //   var randomNode =  nodesArrDup.splice( randomNodeIndex, 1 )[0];    // Node with randomID
  //   // randomNode.id = i; // d3 seems to require all nodes ot have a unique ID
  //   selectedNodes.push( randomNode );
  // }

  // For debugging, picking the same 10 initial nodes everytime
  selectedNodes = nodesArrDup.splice(0,10);


  // Adding children after all the random nodes have been selected, to prevent initial nodes from missing added nodes
  selectedNodes.forEach( node => node.children = getNodeChildren(node.id));


  root = selectedNodes;
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

  var nodes = selectedNodes; //flatten(root);
  var links = d3.layout.tree().links(selectedNodes);
 
  
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
  var imageBasePath = (document.location.href.indexOf('github') === -1 ? '/assets/images' : 'https://raw.githubusercontent.com/QasimQureshi/force-directed-graph/master/assets/images');
  var images = nodeEnter.append("svg:image")
        // ternary operator checks to ensure this node has an image
        .attr("xlink:href",  function(d) { return !!d.image ? imageBasePath + '/doodles-100px/' + d.image.url.substr(d.image.url.lastIndexOf('/') + 1) : null;})
        // .attr("xlink:href", function(d) { return imageBasePath + "_029-loop.png"})
        .attr("x", function(d) { return -30;})
        .attr("y", function(d) { return -30;})
        .attr("height", 60)
        .attr("width", 60);
  
  // make the image grow a little on mouse over and add the text details on click
  var setEvents = images
          .on( 'mouseenter', function() {
            // select element in current context
            d3.select( this )
              .transition()
              .duration(750)
              .attr("x", function(d) { return -35;})
              .attr("y", function(d) { return -35;})
              .attr("height", 70)
              .attr("width", 70);
          })
          // set back
          .on( 'mouseleave', function() {
            d3.select( this )
              .transition()
              .duration(750)
              .attr("x", function(d) { return -30;})
              .attr("y", function(d) { return -30;})
              .attr("height", 60)
              .attr("width", 60);
          });
  
  // Text container element, <g> group holds the title & artist fields. And a link [] icon for external links
  var textContainer = nodeEnter.append('svg:g')
    .attr('class', 'textContainer')
    .on( 'click', linkClickHandler)
    .attr("x", x_browser)
    .attr("y", y_browser + 15)

  // Title
  textContainer.append("text")
    .attr("class", "nodeTitle")
    .on( 'click', linkClickHandler)
    .attr('text-anchor', 'middle')
    .attr("x", x_browser)
    .attr("y", y_browser +15)
    .attr("fill", tcBlack)
    .text(function(d) { return d.title; })

  // Artist
  textContainer.append('text')
    .attr('class', 'nodeArtist')
    .on('click', linkClickHandler)
    .attr('text-anchor', 'middle')
    .attr("x", x_browser)
    .attr("y", y_browser +35)
    .attr("fill", tcBlack)
    .text(function(d) { return d.artist; })

    

  // Setting the bounding box, for all text-containers. Used to draw a rectangle area
  textContainer.call(getBB);

  // Adding a background rectangle, behind the text container
  d3.selectAll('g.textContainer')
      .insert('rect', 'text')
      .attr('class', 'textRect')
      .attr('width', function(d){ return d.bbox.width + 10 })
      .attr('height', function(d){ return d.bbox.height + 5 })
      .attr('x', function(d){ return d.bbox.x - 5})
      .attr('y', function(d){return d.bbox.y - 2})
      .style('fill', '#ffffb9')
      .style('stroke', '#ccc')
      .on( 'click', linkClickHandler);

  // External links icon, for _blank links
  textContainer.append('svg:image')
    .attr('xlink:href', function(d) { return d.link.target === "_blank" ? imageBasePath + '/link.png' : ''})
    .attr('x', function(image){ return Number(this.parentNode.querySelector('rect').getAttribute('width') / 2) + 5 })
    .attr('y', function(image){return Number(this.parentNode.querySelector('rect').getAttribute('height')) + 10 })
    .attr('width', 15)
    .attr('height', 15)


  // Opens the URL
  function linkClickHandler(d) {
    console.log(d.link.target);
    // window.location = d.link.url;
    window.open(d.link.url, d.link.target);
  }

  // Returns a bounding box - used to draw rectangles behind text labels, when a node is hovered upon
  function getBB(selection){
    let padding = 10;// Adding padding to render a link element
    selection.each(function(d){
      let bbox = this.getBBox();
      bbox.width = bbox.width + padding;
      d.bbox = bbox;
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

    // Adding node children. 
    var parentNodeObj = selectedNodes.find(node => node.id === d.id),
        clickedNodesChildren = d.children,  // On-screen children of the clicked node (in selectedNodes[])
        nodesArrAllChildren = nodesArr.find(node => node.id === d.id).related, //IDs of all children of the clicked node in nodesArr[]
        nodesArrChildren = nodesArrAllChildren.filter( nodeID => { return !clickedNodesChildren.find( node => node.id === nodeID ) } ), // NodeIDs for children in nodesArrAllChildren[], that _aren't_ currently onscreen
        childrenToAdd = [];

    

    // This node has too many unadded children, we're plucking random children to add
    if( nodesArrChildren.length > maxNodesToAdd)
    {
      // Randomly selecting child nodes, after shuffling nodesArrChildren[], explaination: https://stackoverflow.com/a/49479872/1290849
      childrenToAdd = nodesArrChildren
        .map(x => ({ x, r: Math.random() }))
        .sort((a, b) => a.r - b.r)
        .map(a => a.x)
        .slice(0, maxNodesToAdd);
    }else{
      childrenToAdd = nodesArrChildren;
    }

    // Culling extraneous nodes
    if(selectedNodes.length + childrenToAdd.length > maxNodeNum)
    {
      for(var i = 0; i <= 5; i++)
      {
        let randomIndex = Math.floor(Math.random() * selectedNodes.length);

        // Ensuring that we don't cull the parent node to which we're adding children, in the next step
        if(selectedNodes[randomIndex].id !== d.id)
        {
          selectedNodes.splice(randomIndex, 1);
        }
      }
    }

    // Adding new nodes
    childrenToAdd = childrenToAdd.map( nodeID => getNodeByID(nodeID)); //conterting nodeIDs to actual node objects
    parentNodeObj.children = parentNodeObj.children.concat(childrenToAdd); // Adding nodes as children, of the parent object (used to render links)
    selectedNodes = selectedNodes.concat(childrenToAdd);  // Adding nodes (used to render node elements)

    //Adding node children. _True_ adds any children elements that aren't on-stage rightnow
    // selectedNodes.find( node => node.id === d.id).children = getNodeChildren(d.id, true); 
    console.log(`clicked node is ${d.id}, children are`);
    console.log(d.children);
    update();

    // Animating the node to the center
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
      
      
      if(Math.abs(dx) > 10 || Math.abs(dy) > 10)
      {
        window.requestAnimationFrame(step);
      }else{
        // Animation complete
        d.x = targetX;
        d.y = targetY;
        d.px = d.x;
        d.py = d.y;
        
        // Build the path
        // var defs = vis.insert("svg:defs")
        //   .data(["end"]);
 
 
        // defs.enter().append("svg:path")
        //   .attr("d", "M0,-5L10,0L0,5");
        // debugger;
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
 
// returns an array of children nodes. If addToStage, all children nodes are also added to the stage tree
function getNodeChildren(nodeID, addToStage){
  
  var relatedLinkIDs = nodesArr.find(node => node.id === nodeID).related; // IDs of nodes related to this one
      relatedLinksArr = []; // populated with the actual nodes (not just IDs), this is what we return

  // For every link, checking if the child/target node also exists in selectedNodes[]
  relatedLinkIDs.forEach(childID => {
    var childNode = getNodeByID(childID);
    
    // Pushing the relatedNode to nodesArr, if the childNode also exists in selectedNodes [] (is on-screen)
    // Checking if the current childNode already exists in selectedNodes[] (on-screen nodes to be rendered)
    if (!!selectedNodes.find( node => node.id === childNode.id)){
      relatedLinksArr.push( childNode );  // finding the node with the link.

    // node does not exist in selectedNodes[], but we'll add it there
    }else if(addToStage){
      childNode.children = getNodeChildren(childNode.id);
      selectedNodes.push(childNode);
    }
  })

  return relatedLinksArr;
}

// Returns a node object
function getNodeByID(nodeID){
  let node = nodesArr.filter( node => node.id === nodeID)[0];
  node.children = [];
  return node;
}
 
/**
 * Returns a list of all nodes under the root. 
 */ 
function flatten(root) {

  var nodes = root,
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
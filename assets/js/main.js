'use strict';

var w = innerWidth,
    h = innerHeight,
    tcBlack = "#808080",
    vis, // points to our container element
    maxNodeSize = 40,
    maxNodesToAdd = 5, // The maximum number of children to add in one go
    x_browser = 20, // SVG element's positioning
    y_browser = 25,
    isFocusLocked = false,  // Set to true when we're moving a node to the center & selecting it
    clickedNode, // Points to the node that was clicked
    root,
    maxNodeNum = Math.floor(10 + Math.random() * 5), // Number of nodes to render onscreen. Random between 20 - 50
    path,    // All the paths connecting nodes
    nodesArr,// Array of all nodes
    linksArr,// Array of link data
    selectedNodes = [], // Randomly selected nodes
    selectedLinks = [], // Link data for selectedNodes
    node,    // Points to current SVG DOM selection, for D3 operations
    nodeIDs, // Array of all IDs (used to determine which links to form)
    force = d3.layout.force(),  // D3's force layoud
    aspect = innerWidth / innerHeight,
    nodes,  // D3's nodes & links
    links,
    diagonal, // defines a D3 diagonal projection for use by the node paths later on
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
 

vis = d3.select("#vis").append("svg").attr("width", innerWidth).attr("height", innerHeight);

// So it begins. Loading JSON to defend Helm's Deep
d3.json("assets/js/json/data.json", function(json) {

  nodesArr = json.record; // nodesArr[] holds _all_ nodes. We randomly select and render some

  // Bugfix for D3, making node IDs 0-indexed rather than 1, as per https://stackoverflow.com/a/38913109/1290849
  // Essentially, D3 requires 0-indexed nodes for links to work. the data this function recieves starts from 1, which throws the length of the array off
  nodesArr.map( node => {
    node.id = node.id - 1;

    // Decrementing related-node IDs
    node.related = node.related.map( relatedNodeID => {
      return relatedNodeID - 1;
    })
  })

  // Copying nodesArr to be able to randomly splice & remove nodes non-destructively (i.e. not effecting nodesArr[])
  var nodesArrDup = nodesArr.map((x) => x), 
      randomNodeIndex, // randomIndex to pick
      randomNode;


  // Picking up nodes to initially populate the screen. if ?initial=1,2,3 IDs are specified in the URL (for testing purposes), those are picked
  if( !!window.location.search && window.location.search.indexOf('initial') !== -1)
  {
    // Splitting the querystring ?initial=1,2,3,4,5 starting from '=', then splitting the ,seperated values & converting them to numbers
    let IDs = window.location.search.split('=')[1].split(',').map( (string) => Number(string) );
    selectedNodes = IDs.map( id => {return nodesArr.find( node => node.id === id ) } );

  }else{
    // Picking up random nodes, and populating their children
    for (var i = 0; i < maxNodeNum; i++)
    {
      randomNodeIndex = Math.floor(Math.random() * nodesArrDup.length); // Random index, within range
      randomNode      = nodesArrDup.splice( randomNodeIndex, 1 )[0];    // Node with randomID
      selectedNodes.push( randomNode ); // Holds IDs of all on-screen nodes. I.e. Contains a subset of nodesArr[]
    }
  }
  
  // For debugging, picking the same 10 initial nodes everytime
  // selectedNodes = nodesArrDup.splice(0,10);
  // selectedNodes.push( nodesArr.find( (node) => node.id === 15) ); // Picked node #77, which is a child of #7 and #8
  // nodesArr.find( (node) => node.related.includes(14) && node.related.includes(16)) // finding nodes that have common children
  

  // Getting children IDs for out selected nodes
  selectedNodes.forEach( node => node.children = getNodeChildren(node.id));

  root = selectedNodes;
  root.fixed = true;
  root.x = w / 2;
  root.y = h / 4;
 
 
  // Build the path (d3 initializing stuff)
  var defs = vis.insert("svg:defs")
      .data(["end"]);
 
  defs.enter().append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");
 
  update();
});//json loading ENDs


// Initialises (or refreshes) the D3 layout
function update() {
  
  nodes = selectedNodes; 
  links = d3.layout.tree().links(selectedNodes),
  diagonal = d3.svg.diagonal().projection(function(d){  //define a d3 diagonal projection for use by the node paths later on asdf
    return [d.y, d.x]
  }); 
  
  // Restart the force layout.
  force.nodes(nodes)
    .links(links)
    .gravity(0.1)
    .charge(-1500)
    .linkDistance(200)
    .friction(0.1)
    .linkStrength(function(l, i) {return 1; })
    .size([w, h])
    .on("tick", tick)
        .start();
 

  path = vis.selectAll("path.link")
    .data(links)
    //, function(d) { debugger; return d.target.id; });
  
  path.enter().insert("svg:path")
    .attr("class", "link")
    .style("stroke", "#eee");
 
 
  // Exit (close, in D3 parlance) any old paths.
  // path.exit().remove();
 
  // Update the nodes…
  node = vis.selectAll("g.node")
      .data(nodes, function(d) { return d.id; });
 
  // Enter any new nodes.
  var nodeEnter = node.enter().append("svg:g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .call(force.drag);
 
  // Append a circle
  nodeEnter.append("svg:circle")
      .attr("r", function(d) { return Math.sqrt(d.size) / 10 || 4.5; })
      .style("fill", "#eee");

   
  // Append images
  // imageBasePath workaround to load images on GitHub pages
  var imageBasePath = (document.location.href.indexOf('github') === -1 ? '/assets/images' : 'https://raw.githubusercontent.com/QasimQureshi/force-directed-graph/master/assets/images');
  var images = nodeEnter.append("svg:image")
        // ternary operator checks to ensure this node has an image
        .attr("xlink:href",  function(d) { return !!d.image ? imageBasePath + '/doodles-100px/' + d.image.url.substr(d.image.url.lastIndexOf('/') + 1) : null;})
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

  // Title label
  textContainer.append("text")
    .attr("class", "nodeTitle")
    .on( 'click', linkClickHandler)
    .attr('text-anchor', 'left')
    .attr("x", x_browser)
    .attr("y", y_browser +15)
    .attr("fill", tcBlack)
    .text(function(d) { return d.title; })// for debugging, showing d.id instead of d.title. asdf

  // Artist label
  textContainer.append('text')
    .attr('class', 'nodeArtist')
    .on('click', linkClickHandler)
    .attr('text-anchor', 'left')
    .attr("x", x_browser)
    .attr("y", y_browser +30)
    .attr("fill", tcBlack)
    .text(function(d) { return d.artist; })


  // Setting the bounding box, for all text-containers. This is used to draw a rectangle area
  textContainer.call(getBB);

  // Adding a background rectangle, behind the text container
  d3.selectAll('g.textContainer')
      .insert('rect', 'text')
      .attr('class', 'textRect')
      .attr('width', function(d){ return d.bbox.width + 10 })
      .attr('height', function(d){ return d.bbox.height + 5 })
      .attr('x', function(d){ return d.bbox.x - 5})
      .attr('y', function(d){return d.bbox.y - 2})
      .style('fill', '#ffffd3')
      .style('stroke', '#ccc')
      .on( 'click', linkClickHandler);

  // Adding external links icon, for _blank links
  textContainer.append('svg:image')
    .attr('xlink:href', function(d) { return d.link.target === "_blank" ? imageBasePath + '/link.png' : ''})
    .attr('x', function(image){ return Number(this.parentNode.querySelector('rect').getAttribute('width')) - 1 })
    .attr('y', function(image){return Number(this.parentNode.querySelector('rect').getAttribute('height')) + 10 })
    .attr('width', 15)
    .attr('height', 15)

  // Label click-handler, opens the URL
  function linkClickHandler(d) {
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

  // vis.append("path", "g")
  //   .attr('class', 'link')
  //   .attr('d', function(){
      
  //     var oTarget = {
  //       x: selectedNodes[1].x,
  //       y: selectedNodes[1].y
  //     }
  //     var oSource = {
  //       x: selectedNodes[2].x,
  //       y: selectedNodes[2].y
  //     };

  //     debugger;
  //     // asdf
  //     return diagonal({
  //       source: oSource,
  //       target: oTarget
  //     });
  //   });
 
  // Exit any old nodes.
  node.exit().remove();
 
 
  // Re-select for update.
  path = vis.selectAll("path.link");
  node = vis.selectAll("g.node");

  // node.on('dragenter', e => {console.log(`${e.target} is dragged`)});
  
  // Node click handler, centers nodes
  node.on('click', function(d){

    // Adding node children. 
    var parentNodeObj = selectedNodes.find(node => node.id === d.id),
        clickedNodesChildren = d.children,  // On-screen children of the clicked node (in selectedNodes[])
        nodesArrAllChildren = nodesArr.find(node => node.id === d.id).related, //IDs of all children of the clicked node in nodesArr[]
        nodesArrChildren = nodesArrAllChildren.filter( nodeID => { return !clickedNodesChildren.find( node => node.id === nodeID ) } ), // NodeIDs for children in nodesArrAllChildren[], that _aren't_ currently onscreen
        childrenToAdd = [];

    
    // If this node has too many unadded children, we're plucking random children to add
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
      // Removing 5 random nodes
      for(var i = 0; i <= 5; i++)
      {
        let randomIndex = Math.floor(Math.random() * selectedNodes.length);

        // Ensuring that we don't cull the parent node to which we're adding children, in the next step
        if(selectedNodes[randomIndex].id !== d.id)
        {
          // Removing links that have the current node as the source, or destination
          let deletionNodeID = selectedNodes[randomIndex].id;
          for(var i = links.length - 1; i >= 0; i--)
          {
            console.log(i);
            if(links[i].source.id === deletionNodeID || links[i].target.id === deletionNodeID)
            {
              links.splice(i, 1);
            }
          }
          selectedNodes.splice(randomIndex, 1);
          console.log(`Node IDs removed: ${randomIndex}, parentID is ${d.id}`);
        }

      }
    }

    // Adding new nodes
    childrenToAdd = childrenToAdd.map( nodeID => getNodeByID(nodeID)); //conterting nodeIDs to actual node objects
    parentNodeObj.children = parentNodeObj.children.concat(childrenToAdd); // Adding nodes as children, of the parent object (used to render links)
    selectedNodes = selectedNodes.concat(childrenToAdd);  // Adding nodes (used to render node elements)

    //Adding node children. _True_ adds any children elements that aren't on-stage rightnow
    // selectedNodes.find( node => node.id === d.id).children = getNodeChildren(d.id, true); 
    update();tick();

    // Animating the node to the center
    var targetX = w / 2,
        targetY = h / 2,
        divisor = 16,
        dx,
        dy;

    // RequestAnimationFrame event-handler
    function step(timestamp){

      // Animating the node towards the center
      dx = targetX - d.x,
      dy = targetY - d.y;
      d.x += dx / divisor;
      d.y += dy / divisor;
      d.px = d.x;
      d.py = d.y;
      tick(); // updates the screen
      
      
      if(Math.abs(dx) > 10 || Math.abs(dy) > 10)
      {
        window.requestAnimationFrame(step);
      }else{
        // Animation complete
        d.x = targetX;
        d.y = targetY;
        d.px = d.x;
        d.py = d.y;
      }
    }// step() ENDs

    window.requestAnimationFrame(step);
  })
}// Update function ends

// The basic D3 enterFrame function. Used to move nodes about
function tick() {

    path.attr("d", function(d) {
        
      var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy);

      var val = "M" + d.source.x + "," 
                + d.source.y 
                + "L" + d.target.x + "," 
                + d.target.y;
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
 
// returns an array of children nodes. If addToStage, all children nodes are also added to the stage tree
function getNodeChildren(nodeID, addToStage){
  
  var relatedLinkIDs = nodesArr.find(node => node.id === nodeID).related, // IDs of nodes related to this one
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
      childNode.children = [];//getNodeChildren(childNode.id);
      selectedNodes.push(childNode);
    }
  })

  if( [18,14,16].includes(nodeID) )
    // debugger;

  return relatedLinksArr;
}

// Returns a node object
function getNodeByID(nodeID){
  let node = nodesArr.filter( node => node.id === nodeID)[0];
  // node = { ...node};
  if(node.children === undefined)
    node.children = [];
  
  return node;
}
 
/*** Returns a list of all nodes under the root. Leaving this as a reference, the D3v3 bl.ocks.org Marvel example uses this http://bl.ocks.org/eesur/raw/be2abfb3155a38be4de4/ */ 
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
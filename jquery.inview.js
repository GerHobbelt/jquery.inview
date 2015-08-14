/**
 * author Christopher Blum
 *    - based on the idea of Remy Sharp, http://remysharp.com/2009/01/26/element-in-view-event-plugin/
 *    - forked from https://github.com/zuk/jquery.inview/
 */

// UMD returnExports
(function(root, factory) {

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);

  } else {
    // Browser globals
    factory(root.jQuery);
  }
}(this, function ($) {
  'use strict';


  var timer, viewportSize, viewportOffset;
  var d = document;
  var expando = $.expando;
  var inviewObjects = {};
  var w = window;

  var documentElement = d.documentElement;

  $.event.special.inview = {
    add: function(data) {
      inviewObjects[data.guid + "-" + this[expando]] = { data: data, $element: $(this) };

      // Use setInterval in order to also make sure this captures elements within
      // "overflow:scroll" elements or elements that appeared in the dom tree due to
      // dom manipulation and reflow
      // old: $(window).scroll(checkInView);
      //
      // By the way, iOS (iPad, iPhone, ...) seems to not execute, or at least delays
      // intervals while the user scrolls. Therefore the inview event might fire a bit late there
      //
      // Don't waste cycles with an interval until we get at least one element that
      // has bound to the inview event.
      if (!timer && !$.isEmptyObject(inviewObjects)) {
        timer = setTimeout(function() {
          timer = null;
          checkInView();
        }, 250);
      }
    },

    remove: function(data) {
      try { 
        delete inviewObjects[data.guid + "-" + this[expando]]; 
      } catch(e) {}

      // Clear interval when we no longer have any elements listening
      if ($.isEmptyObject(inviewObjects)) {
        clearInterval(timer);
        timer = null;
      }
    }
  };

  function getViewportSize() {
    var mode, domObject, size = { height: w.innerHeight, width: w.innerWidth };

    // if this is correct then return it. iPad has compat Mode, so will
    // go into check clientHeight/clientWidth (which has the wrong value).
    if (!size.height) {
      mode = d.compatMode;
      if (mode || !$.support.boxModel) { // IE, Gecko
        domObject = mode === 'CSS1Compat' ?
          documentElement : // Standards
          d.body; // Quirks
        size = {
          height: domObject.clientHeight,
          width:  domObject.clientWidth
        };
      }
    }

    return size;
  }

  function getViewportOffset() {
    return {
      top:  w.pageYOffset || documentElement.scrollTop   || d.body.scrollTop,
      left: w.pageXOffset || documentElement.scrollLeft  || d.body.scrollLeft
    };
  }

  function checkInView() {
    var $elements = [], elementsLength, i = 0;

    $.each(inviewObjects, function(i, inviewObject) {
      var selector  = inviewObject.data.selector,
          $element  = inviewObject.$element;
      $elements.push(selector ? $element.find(selector) : $element);
    });

    elementsLength = $elements.length;
    if (elementsLength) {
      viewportSize   = getViewportSize();
      viewportOffset = getViewportOffset();

      for (; i < elementsLength; i++) {
        // Ignore elements that are not in the DOM tree
        if (!$.contains(documentElement, $elements[i][0])) {
          continue;
        }

        var $element      = $($elements[i]),
            elementSize   = { height: $element.height(), width: $element.width() },
            elementOffset = $element.offset(),
            visiblePartX,
            visiblePartY,
            visibleWidth,
            visibleHeight,
            visiblePercentWidth,
            visiblePercentHeight,
            visiblePartsMerged;

        // Don't ask me why because I haven't figured out yet:
        // viewportOffset and viewportSize are sometimes suddenly null in Firefox 5.
        // Even though it sounds weird:
        // It seems that the execution of this function is interferred by the onresize/onscroll event
        // where viewportOffset and viewportSize are unset
        if (!viewportOffset || !viewportSize) {
          return;
        }

        // var inView = $element.data('inview');

        if (elementOffset.top + elementSize.height > viewportOffset.top &&
            elementOffset.top < viewportOffset.top + viewportSize.height &&
            elementOffset.left + elementSize.width > viewportOffset.left &&
            elementOffset.left < viewportOffset.left + viewportSize.width) {
          visiblePartX = ((viewportOffset.left > elementOffset.left) && ((viewportOffset.left + viewportSize.width) < (elementOffset.left + elementSize.width)) ?
		    'middle' : viewportOffset.left > elementOffset.left ?
            'right' : (viewportOffset.left + viewportSize.width) < (elementOffset.left + elementSize.width) ?
            'left' : 'both');
	      visiblePartY = ( (viewportOffset.top > elementOffset.top && ((viewportOffset.top + viewportSize.height) < (elementOffset.top + elementSize.height))) ? 
            'middle' : (viewportOffset.top > elementOffset.top) ?
	        'bottom' : (viewportOffset.top + viewportSize.height) < (elementOffset.top + elementSize.height) ?
	        'top' : 'both');
          
          //
          // calculate intersection rectangle to know percentual width and height. 
          // There's always intersection because the element is inside the viewport
          var x0 = Math.max(viewportOffset.left, elementOffset.left);
          var x1 = Math.min(viewportOffset.left + viewportSize.width, elementOffset.left + elementSize.width);
          var y0 = Math.max(viewportOffset.top, elementOffset.top);
          var y1 = Math.min(viewportOffset.top + viewportSize.height, elementOffset.top + elementSize.height);
          
          // complete intersect rectangle will be: {'left':x0,'top':y0,'width':x1 - x0,'height':y1 - y0};
          visibleWidth  = x1 - x0;
          visibleHeight = y1 - y0;

          visiblePercentWidth  = Math.round(visibleWidth*100/elementSize.width);
          visiblePercentHeight = Math.round(visibleHeight*100/elementSize.height);

          visiblePartsMerged = visiblePartX + "-" + visiblePartY + "-" + visiblePercentWidth + "-" + visiblePercentHeight;
          // if (!inView || inView !== visiblePartsMerged) {
          // $element.data('inview', visiblePartsMerged).
          $element.trigger('inview', [true, visiblePartX, visiblePartY, visiblePercentWidth, visiblePercentHeight]);
          // }
        }
        // } else if (inView) {
        //  $element.data('inview', false).trigger('inview', [false]);
        //}
      }
    }
  }

  function createFunctionLimitedToOneExecutionPerDelay(fn, delay) {
    var shouldRun = false;
    var timer = null;

    function runOncePerDelay() {
        if (timer !== null) {
            shouldRun = true;
            return;
        }
        shouldRun = false;
        fn();
        timer = setTimeout(function() {
            timer = null;
            if (shouldRun) {
                runOncePerDelay();
            }
        }, delay);
    }

    return runOncePerDelay;
  }

  var runner = createFunctionLimitedToOneExecutionPerDelay(function() {
    viewportSize = viewportOffset = null;
    // Use setInterval in order to also make sure this captures elements within
    // "overflow:scroll" elements or elements that appeared in the dom tree due to
    // dom manipulation and reflow
    // old: $(window).scroll(checkInView);  -->  
    checkInView();
  }, 100);
  $(w).on('checkInView.inview click.inview ready.inview scroll.inview resize.inview scrollstop.inview ', runner);

  // By the way, iOS (iPad, iPhone, ...) seems to not execute, or at least delays
  // intervals while the user scrolls. Therefore the inview event might fire a bit late there
  // old: setInterval(checkInView, 250);

  // IE < 9 scrolls to focused elements without firing the "scroll" event
  if (!documentElement.addEventListener && documentElement.attachEvent) {
    documentElement.attachEvent("onfocusin", function() {
      viewportOffset = null;
    });
  }

  $.inviewCheck = checkInView;
}));

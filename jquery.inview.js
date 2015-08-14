/**
 * author Christopher Blum
 *    - based on the idea of Remy Sharp, http://remysharp.com/2009/01/26/element-in-view-event-plugin/
 *    - forked from https://github.com/zuk/jquery.inview/
 */

// UMD returnExports
(function (root, factory) {

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else {
    // Browser globals
    factory(root.jQuery);
  }
}(this, function ($) {
  'use strict';

  var viewportSize, viewportOffset, runner;
  var d = document;
  var expando = $.expando;
  var inviewObjects = {};
  var w = window;

  var documentElement = d.documentElement;

  // https://learn.jquery.com/events/event-extensions/
  $.event.special.inview = {
    add: function (data) {
      var hash = data.guid + "-" + this[expando];
      // multiple elements may register the same event at the same time: track ALL the elements:
      if (!inviewObjects[hash]) {
        inviewObjects[hash] = { data: data, $element: [$(this)] };
      } else {
        inviewObjects[hash].$element.push($(this));
      }

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
      if (!$.isEmptyObject(inviewObjects)) {
        runner.execute_delayed();
      }
    },

    remove: function (data) {
      try { 
        delete inviewObjects[data.guid + "-" + this[expando]]; 
      } catch(e) {}

      // Clear interval when we no longer have any elements listening
      if ($.isEmptyObject(inviewObjects)) {
        runner.clear_and_stop();
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

    $.each(inviewObjects, function (i, inviewObject) {
      var selector  = inviewObject.data.selector,
          $element  = inviewObject.$element;
      $.each($element, function (el_idx, $el) {
        $elements.push(selector ? $el.find(selector) : $el);
      });
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

        var inView = $element.data('inview');

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
          
          // complete intersect rectangle will be: {'left':x0, 'top':y0, 'width':x1 - x0, 'height':y1 - y0};
          visibleWidth  = x1 - x0;
          visibleHeight = y1 - y0;

          visiblePercentWidth  = Math.round(visibleWidth * 100 / elementSize.width);
          visiblePercentHeight = Math.round(visibleHeight * 100 / elementSize.height);

          visiblePartsMerged = visiblePartX + '-' + visiblePartY + '-' + visiblePercentWidth + '-' + visiblePercentHeight;
          if (!inView || inView !== visiblePartsMerged) {
            $element
              .data('inview', visiblePartsMerged)
              .trigger('inview', [true, visiblePartX, visiblePartY, visiblePercentWidth, visiblePercentHeight]);
          }
        } else if (inView) {
          $element.data('inview', false).trigger('inview', [false]);
        }
      }
    }
  }

  function createFunctionLimitedToOneExecutionPerDelay(fn, delay) {
    var timer = null;

    function runOncePerDelay() {
      fn();
    }

    // Kill the timer-delay or the subsequent call; stop the timer altogether. 
    // A call to one of the other methods will restart the interval of the repeated
    // invocation of the function.
    runOncePerDelay.clear_and_stop = function () {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    // Restart the timer-delay for the subsequent call. The function will be invoked at the 
    // specified `delay` interval until the code executes the `clear_and_stop()` call. 
    runOncePerDelay.restart = function () {
      runOncePerDelay.clear_and_stop();
      timer = setTimeout(function () {
        timer = null;
        runOncePerDelay.execute_debounced();
      }, delay);
    };

    // execute the function immediately *and* *restart* the timer-delayed subsequent call
    runOncePerDelay.execute_immediately = function () {
      runOncePerDelay();
      runOncePerDelay.restart();
    };

    // Restart the time-delayed function invocation if one isn't pending already
    runOncePerDelay.execute_delayed = function () {
      if (timer === null) {
        runOncePerDelay.restart();
      }
    };

    // Execute the function immediately *iff* the function hasn't been invoked in the recent past.
    // Also *restart* the time-delay for the subsequent function call.
    runOncePerDelay.execute_debounced = function () {
      if (timer === null) {
        runOncePerDelay();
        runOncePerDelay.restart();
      }
      // else: the timer is already running and should execute the next function invocation
      // instead of executing it right now and restarting the timer.
    };

    return runOncePerDelay;
  }

  runner = createFunctionLimitedToOneExecutionPerDelay(function () {
    viewportSize = viewportOffset = null;
    // Use setInterval in order to also make sure this captures elements within
    // "overflow:scroll" elements or elements that appeared in the dom tree due to
    // dom manipulation and reflow, e.g. jQuery `.css()` calls wich reposition some
    // elements.
    // 
    // old: $(window).scroll(checkInView);  -->  
    checkInView();
  }, 100);

  var $w = $(w);
  // support jQuery < 1.8:
  $(w).bind('checkInView.inview click.inview ready.inview scroll.inview resize.inview scrollstop.inview ', runner.execute_debounced);

  // By the way, iOS (iPad, iPhone, ...) seems to not execute, or at least delays
  // intervals while the user scrolls. Therefore the inview event might fire a bit late there
  // old: setInterval(checkInView, 250);

  // IE < 9 scrolls to focused elements without firing the "scroll" event
  if (!documentElement.addEventListener && documentElement.attachEvent) {
    documentElement.attachEvent("onfocusin", function () {
      viewportOffset = null;
    });
  }

  $.inviewCheck = runner;
}));

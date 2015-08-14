# Element 'in view' Event Plugin

*Author:* Remy Sharp

*Pulled from:* http://remysharp.com/2009/01/26/element-in-view-event-plugin/

*NOTE: "I" here refers to the original author, Remy Sharp.*

I've been preparing a few articles for [jQuery for Designers][] and for
[.net magazine][] and in doing so I've had to write a plugin that could prove
to be useful to share.

I've created an event that will trigger when the element is scrolled in to the
viewport.


## Preamble

First of all, this isn't *really* a plugin. It's a utility of sorts. It's not
really a plugin, because you don't call it. It binds on to the scroll event and
does the work for you.

Also, I'm aware that there is the [lazyload plugin][]. I've not had real time to
play with it, but I suspect there's some similarities, though my inview plugin
is extremely stripped down (because I wrote it for a particular purpose). Also
note that my code only works for vertical scroll, and not horizontal.

I should also add that this utility/plugin was inspired by [Dustin Diaz's][]
[detect when an element scrolls in to view code][].


## Demo

The example is mostly *lorem* text, but in the middle of the page is an element
whose text reads: "You can't see me". When the element is scrolled in to view
it will change to "You found me".

To confirm this, open firebug while the element is out of view, and watch the
element in question as you scroll it in to view.

http://jsbin.com/ugupa: (to edit: http://jsbin.com/ugupa/edit)


## Download

[Download jQuery inview event plugin][]

Or from github at: http://github.com/zuk/jquery.inview


## Usage

The script makes use of the new [$.support][] properties - so it will only work
with jQuery 1.4 upwards. If you need to use it with older versions of jQuery,
drop a comment, and I'll post an alternative.

The event will only fire when the element comes in to view of the viewport, and
out of view. It won't keep firing if the user scrolls and the element remains in
view.

Bear in mind if you think the element may already be in view, you may need to
kick the scroll event using `$(window).trigger('checkInView')`. If you include
this plugin last (i.e., *after* you've hooked in to the event) then the script
will automatically trigger the kick for you; thus, sending the event to your
bound element.

The variable after the event argument indicates the visible state in the
viewport. 
The third variable visiblePartX detects which horizontal part of the element is visible to the user (possible values: left, right, middle, both).
The fourth variable visiblePartY detects which vertical part of the element is visible to the user (possible values: top, bottom, middle, both).
The fourth variable visiblePercentWidth indicates the percentage visible width of the item. 
The fifth variable visiblePercentHeight indicates the percentage visible height of the item. 

```js
$('div').bind('inview', function (event, visible, visiblePartX, visiblePartY, visiblePercentWidth, visiblePercentHeight) {
  if (visible) {
    // element is now visible in the viewport
    if (visiblePartY == 'top') {
      // top part of element is visible
    } else if (visiblePartY == 'bottom') {
      // bottom part of element is visible
	} else if (visiblePartY == 'middle) {
	  // element is larger than the viewport, top and bottom are offscreen, but middle is visible
    } else {
      // whole part of element is visible
    }
    // console.log ('Visible height : ' + visiblePercentHeight + '%');
  } else {
    // element has gone out of viewport
  }
});
```

To stop listening for the event - simply unbind:

```js
$('div').unbind('inview');
```

Remember you can also bind once:

```js
$('div').one('inview', fn);
```



## Live events

Yep, inview events can also be used with .live/.delegate methods.

_Please note that this could slow down your app when the selector 
is too complex and/or matches a huge set of elements._

The following code snippet only loads images when they appear 
in the browser's viewport.

```js
  // Assuming that all images have set 
  // the 'data-src' attribute instead of 
  // the 'src' attribute
  $("img[data-src]").live("inview", function() {
    var $this = $(this);
    $this.attr("src", $this.attr("data-src"));
    // Remove it from the set of matching elements 
    // in order to avoid that the handler gets re-executed
    $this.removeAttr("data-src");
  });
```


## More complex example

This way we can attach inView to some DIV in our code to, for example, detect
when it FULLY read by user (user sees its bottom and top) and only after 1
seconds of view, so after we call some out stats function or whatever:

```js
$(someMyOneDiv).bind('inview', function(e, isInView, visiblePartX, visiblePartY) {
  var o = $(this);

  if(o.data('inviewtimer')) {
    clearTimeout(o.data('inviewtimer'));
    o.removeData('inviewtimer');
  }

  if (isInView) {
    o.data('inviewtimer', setTimeout(function() {
      if (visiblePartY == 'top') {
        o.data('seenTop', true);
      } else if (visiblePartY == 'bottom') {
        o.data('seenBottom', true);
      } else {
        o.data('seenTop', true);
        o.data('seenBottom', true);
      }

      if (o.data('seenTop') && o.data('seenBottom')) {
        o.unbind('inview');
        // here we will do WHAT WHE NEED (for ex. Call Ajax stats collector)
        // ...
      }
    }, 1000));
  }
});
```

> Maybe there's a way to do this more elegant. And someone needed to test this on
> IE6-7-8 (they're nasty).


## How it works

When the window is scrolled, the event checks the position of the elements
against the viewport height and the scrollTop position.

However, I wanted to create a utility that would only check the elements that
were registered under the 'inview' event, i.e. I didn't want to keep checking
the element list if we unbind from the event.

This is achieved by dipping in to the $.cache store within jQuery, and looping
through, looking for the elements tied to the 'inview' event.

This way the user can treat it like a native event on the page.


## Offset Feature

If you decide to use this code for lazy loading images, you might be interested
in preloading the image when it's getting close to entering the viewport. To
do this, you can now add a `data-offset` attribute to your target element.
For example:

```html
<img data-offset="300">
```

or in JavaScript:

```js
$('img').attr('data-offset', 300);
```

This allows the image to preload as it approaches the viewport so there's a
better chance it will complete before the user even sees it.


## Use cases

* Reduce http requests and traffic on server by loading assets (images, javascript, html, ...) only when they are visible to the user
* Endless scrolling (twitter-like)
* Tracking (eg. to see whether a user has read an entire article)
* ...


## Browser Compatibility

### The Test Suite succeeds in the following browsers that were tested:

* Firefox 3+
* Safari 3+
* Chrome 7+
* Opera 10+
* IE 6+
* Mobile Safari on iPad 4.2.2
* Fennec 4b on Android 2.2
* Opera Mobile 10.1b on Android 2.2


### The Test Suite doesn't completely succeed but the demos in this repository work without problems in the following browsers:

* Mobile WebKit on Android 2.2
* Mobile WebKit on Palm Pre 1




[jQuery for Designers]: http://jqueryfordesigners.com/
[.net magazine]: http://www.netmag.co.uk/
[lazyload plugin]: http://www.appelsiini.net/projects/lazyload
[Dustin Diaz's]: http://www.dustindiaz.com/
[detect when an element scrolls in to view code]: http://www.dustindiaz.com/element-scroll-into-view/
[Download jQuery inview event plugin]: http://remysharp.com/downloads/jquery.inview.js
[$.support]: http://api.jquery.com/?support


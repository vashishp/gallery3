/*
 * @todo Trap resize of dialog and resize the child areas (tree, grid and edit form)
 * @todo create the dialog close method and reload the page on exit.
 */
var url;
var height;
var paused = false;
var task = null;

// **************************************************************************
// JQuery UI Widgets
// Draggable
var draggable = {
  cancel: ".gMicroThumbContainer:not(.ui-selected)",
  handle: ".gMicroThumbContainer.ui-selected",
  revert: true,
  zindex: 2000,
  helper: function(event, ui) {
    console.dir(ui);
    $("#gMicroThumbPanel").append("<div id=\"gDragHelper\"><ul></ul></div>");
    var beginTop = event.pageY;
    var beginLeft = event.pageX;
    var zindex = $(".gMicroThumbContainer").draggable("option", "zindex");
    $("#gDragHelper").css('top', event.pageY - 22.5);
    $("#gDragHelper").css('left', event.pageX + 22.5);
    var placeHolder = $(this).clone();
    $(placeHolder).attr("id", "gPlaceHolder");
    $(placeHolder).css("visibility", "hidden");
    $(placeHolder).removeClass("ui-selected");
    $(placeHolder).removeClass("ui-draggable");
    $(this).after(placeHolder);

    $("li.ui-selected").each(function(i) {
      var clone = $(this).clone();
      $(clone).attr("id", "drag_clone_" + $(this).attr("ref"));
      $("#gDragHelper ul").append(clone);
      $(clone).css("position", "absolute");
      $(clone).css("top", beginTop);
      $(clone).css("left", beginLeft);
      $(clone).css("z-index", zindex--);
      $(this).hide();

      var children = $(clone).find(".gMicroThumb .gThumbnail");
      var width = new String(children.css("width")).replace(/[^0-9]/g,"") * .5;
      height = new String(children.css("height")).replace(/[^0-9]/g,"") * .5;
      var marginTop = new String(children.css("margin-top")).replace(/[^\.0-9]/g,"") * .5;
      children.attr("width", width);
      children.attr("height", height);
      children.css("margin-top", marginTop);
      if (i < 9) {
        beginTop -= 5;
        beginLeft += 5;
      }
    });
    return $("#gDragHelper");
  },
  stop: function(event, ui) {
    $("#gDragHelper li").each(function(i) {
      $("#thumb_" + $(this).attr("ref")).show();
    });
    $(".gMicroThumbContainer.ui-selected").css("z-index", null);
    $("#gDragHelper").remove();
    $("#gPlaceHolder").remove();
  }
};

// Droppable
var droppable =  {
  tolerance: "pointer",
  drop: function(event, ui) {
    $("#gDragHelper").hide();
    $("#gPlaceHolder").hide();
    var newOrder = "";
    $("#gMicroThumbGrid .gMicroThumbContainer").each(function(i) {
      if ($(this).attr("id") == "gPlaceHolder") {
        $("#gDragHelper li").each(function(i) {
          newOrder += "&item[]=" + $(this).attr("ref");
        });
      } else if ($(this).css("display") != "none") {
        newOrder += "&item[]=" + $(this).attr("ref");
      } else  {
        // If its not displayed then its one of the ones being moved so ignore.
      }
    });
    $("#gDragHelper li").each(function(i) {
      $("#gPlaceHolder").before($("#thumb_" + $(this).attr("ref")).show());
    });
    $.ajax({
      data: newOrder,
      dataType: "json",
      success: startRearrangeCallback,
      type: "POST",
      url: get_url("organize/rearrangeStart")
    });
  }
};

// Selectable
var selectable = {
  count: 0,
  filter: ".gMicroThumbContainer",
  selected: function(event, ui) {
    /*
     * Count the number of selected items if it is greater than 1,
     * then click won't be called so we need to remove the gSelecting
     * class in the stop event.
     */
    var count = $("#gMicroThumbGrid").selectable("option", "count") + 1;
    $("#gMicroThumbGrid").selectable("option", "count", count);
    $(ui.selected).addClass("gSelecting");
  },
  stop: function(event) {
    var count = $("#gMicroThumbGrid").selectable("option", "count");
    if (count > 1) {
      $(".gMicroThumbContainer.gSelecting").removeClass("gSelecting");
    }
    $("#gMicroThumbGrid").selectable("option", "count", 0);
  }
};

// **************************************************************************
// Event Handlers
// MicroThumbContainer click
var onMicroThumbContainerClick = function(event) {
  if ($(this).hasClass("gSelecting")) {
    $(this).removeClass("gSelecting");
  } else {
    $(this).removeClass("ui-selected");
  }
};

// MicroThumbContainer mousemove
var onMicroThumbContainerMousemove = function(event) {
  if ($("#gDragHelper").length > 0 && $(this).attr("id") != "gPlaceHolder") {
    if (event.pageX < $(this).offset().left + $(this).width() / 2) {
      $(this).before($("#gPlaceHolder"));
    } else {
      $(this).after($("#gPlaceHolder"));
    }
    var container = $("#gMicroThumbPanel").get(0);
    var scrollHeight = container.scrollHeight;
    var scrollTop = container.scrollTop;
    var height = $(container).height();
    if (event.pageY > height + scrollTop) {
      container.scrollTop = this.offsetTop;
    } else if (event.pageY < scrollTop) {
      container.scrollTop -= height;
    }
  }
};

// Select All and Deselect All click
function toggleSelectAll(event) {
  if ($(this).attr("id") == "gMicroThumbSelectAll") {
    $(".gMicroThumbContainer").addClass("ui-selected");
    $("#gMicroThumbSelectAll").hide();
    $("#gMicroThumbUnselectAll").show();
  } else {
    $(".gMicroThumbContainer").removeClass("ui-selected");
    $("#gMicroThumbSelectAll").show();
    $("#gMicroThumbUnselectAll").hide();
  }
}

// **************************************************************************
// AJAX Callbacks
// MicroThumbContainer click
var getMicroThumbsCallback = function(json, textStatus) {
  if (json.count > 0) {
    $("#gMicroThumbGrid").append(json.data);
    retrieveMicroThumbs();
    $(".gMicroThumbContainer").click(onMicroThumbContainerClick);
    $(".gMicroThumbContainer").mousemove(onMicroThumbContainerMousemove);
    $(".gMicroThumbContainer").draggable(draggable);
  }
};

var startRearrangeCallback = function (data, textStatus) {
  if (!paused) {
    $("#gDialog #ft").css("visibility", "visible");
    $(".gProgressBar").progressbar("value", 0);
    task = data.task;
  }
  $(".gMicroThumbContainer").draggable("disable");
  var done = false;
  paused = false;
  while (!done && !paused) {
    $.ajax({async: false,
      success: function(data, textStatus) {
        $(".gProgressBar").progressbar("value", data.task.percent_complete);
         done = data.task.done;
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        paused = true;
        displayAjaxError(XMLHttpRequest.responseText);
      },
      dataType: "json",
      type: "POST",
      url: get_url("organize/rearrangeRun", task.id)
    });
  }
  if (!paused) {
    $("#gDialog #ft").css("visibility", "hidden");
    $.ajax({async: false,
      success: function(data, textStatus) {
      },
      dataType: "json",
      type: "POST",
      url: get_url("organize/rearrangeFinish", task.id)
    });
  }
  $(".gMicroThumbContainer").draggable("enable");
};

// **************************************************************************

/**
 * Dynamically initialize the organize dialog when it is displayed
 */
function organize_dialog_init() {
  var size = getViewportSize();
  height = size.height() - 100;
  var width = size.width() - 100;

  // Deal with ui.jquery bug: http://dev.jqueryui.com/ticket/4475
  $(".sf-menu li.sfHover ul").css("z-index", 70);

  $("#gDialog").dialog("option", "width", width);
  $("#gDialog").dialog("option", "height", height);

  $("#gDialog").dialog("open");
  if ($("#gDialog h1").length) {
    $("#gDialog").dialog('option', 'title', $("#gDialog h1:eq(0)").html());
  } else if ($("#gDialog fieldset legend").length) {
    $("#gDialog").dialog('option', 'title', $("#gDialog fieldset legend:eq(0)").html());
  }

  $("#gDialog").bind("organize_close", function(target) {
    document.location.reload();
  });

  height -= 2 * parseFloat($("#gDialog").css("padding-top"));
  height -= 2 * parseFloat($("#gDialog").css("padding-bottom"));
  height -= $("#gMicroThumbPanel").position().top;
  height -= $("#gDialog #ft").height();
  height = Math.round(height);

  $("#gMicroThumbPanel").height(height);
  $("#gOrganizeTreeContainer").height(height);

  $(".gOrganizeBranch .ui-icon").click(organizeToggleChildren);
  $(".gBranchText").click(organizeOpenFolder);
  retrieveMicroThumbs(item_id);
  //showLoading("#gDialog");

  $("#gMicroThumbSelectAll").click(toggleSelectAll);
  $("#gMicroThumbUnselectAll").click(toggleSelectAll);

  $("#gMicroThumbPanel").droppable(droppable);
  $("#gMicroThumbGrid").selectable(selectable);

  $(".gProgressBar").progressbar();
  $("#gOrganizeTaskPause").click(function(event) {
    paused = true;
    $("#gOrganizeTaskPause").hide();
    $("#gOrganizeTaskResume").show();
  });
  $("#gOrganizeTaskResume").click(function(event) {
    $("#gOrganizeTaskPause").show();
    $("#gOrganizeTaskResume").hide();
    startRearrangeCallback();
  });
}

function retrieveMicroThumbs() {
  var offset = $("#gMicroThumbGrid li").length;
  if (url == null) {
    var grid_width = $("#gMicroThumbPanel").width();
    url = $("#gMicroThumbPanel").attr("ref");
    url = url.replace("__WIDTH__", grid_width);
    url = url.replace("__HEIGHT__", height);
  }
  var url_data = url.replace("__OFFSET__", offset);
  url_data = url_data.replace("__ITEM_ID__", item_id);
  $.getJSON(url_data, getMicroThumbsCallback);
}

function organizeToggleChildren(event) {
  var id = $(this).attr("ref");
  var span_children = $("#gOrganizeChildren-" + id);
  if ($(this).hasClass("ui-icon-plus")) {
    $(this).removeClass("ui-icon-plus");
    $(this).addClass("ui-icon-minus");
    $("#gOrganizeChildren-" + id).removeClass("gBranchCollapsed");
  } else {
    $(this).removeClass("ui-icon-minus");
    $(this).addClass("ui-icon-plus");
    $("#gOrganizeChildren-" + id).addClass("gBranchCollapsed");
  }
  event.preventDefault();
}

function organizeOpenFolder(event) {
  var selected = $(".gBranchSelected");
  if ($(selected).attr("id") != $(this).attr("id")) {
    $(selected).removeClass("gBranchSelected");
    $(this).addClass("gBranchSelected");
    item_id = $(this).attr("ref");
    $("#gMicroThumbGrid").empty();
    retrieveMicroThumbs();
  }
  event.preventDefault();
}

function get_url(uri, task_id) {
  var url = rearrangeUrl;
  url = url.replace("__URI__", uri);
  url = url.replace("__TASK_ID__", !task_id ? "" : "/" + task_id);
  return url;
}

// **************************************************************************
// Functions that should probably be in a gallery namespace
function getViewportSize() {
  return {
      width : function() {
        return window.innerWidth
          || document.documentElement && document.documentElement.clientWidth
          || document.body.clientWidth;
      },
      height : function() {
        return window.innerHeight
          || document.documentElement && document.documentElement.clientHeight
          || document.body.clientHeight;
      }
  };
}

function displayAjaxError(error) {
  $("body").append("<div id=\"gAjaxError\" title=\"" + FATAL_ERROR + "\">" + error + "</div>");
  $("#gAjaxError").dialog({
      autoOpen: true,
      autoResize: false,
      modal: true,
      resizable: true,
      width: 610,
      height: $("#gDialog").height()
    });
}
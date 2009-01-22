$(document).ready(function(){
  // Add Superfish menu class
  $("#gSiteAdminMenu ul.gMenu").addClass("sf-menu");
  $("ul.gMenu").addClass("sf-menu");

  // Superfish menu options
  $('ul.sf-menu').superfish({
    delay: 500,
    animation: {
      opacity: 'show',
      height: 'show'
    },
    pathClass: 'current',
    speed: 'fast'
  });

  // Apply modal dialogs
  var dialogLinks = $(".gDialogLink");
  for (var i=0; i < dialogLinks.length; i++) {
    $(dialogLinks[i]).bind("click", {element: dialogLinks[i]}, handleDialogEvent);
  }

  $("#gThemeDetailsForm").ajaxForm({
    dataType: "json",
    success: function(body, result, set) {
      if (body.result == "success") {
        $("#gMessage").append("<span class='gSuccess'>" + body.message + "</span>");
      } else {
        $("#gMessage").append("<span class='gError'>" + body.message + "</span>");
      }
    }
  });
	
	// Apply hide/show functionality on user admin view
  var panelLinks = $(".gPanelLink");
  for (i=0; i<panelLinks.length; i++) {
    $(panelLinks[i]).bind("click", {element: panelLinks[i]}, handlePanelEvent);
  }

	function handlePanelEvent(event) {
	  togglePanel(event.data.element);
	  event.preventDefault();
	}
	
	function togglePanel(element) {
		var parent = $(element).parent().parent();
		if (parent.hasClass("gPanel")) {
			var panel = parent;
		} else {
			var panel = $(parent).children(".gPanel");
		}
		
	  panel.slideToggle("slow");
		
//		if ($(element).href.search(/edit_form/)) {
//			$(element).replaceWith("<span>"+$(element).text()+"</span>");
//		}
		
		return false;
	}
	
	// Remove users from group functionality
});
{% load i18n %}
/**
 * QBE Interface details
 */
if (!window.qbe) {
    var qbe = {};
}
qbe.Models = {% autoescape off %}{{ json_models }}{% endautoescape %};
{% if json_data %}
qbe.Data = {% autoescape off %}{{ json_data }}{% endautoescape %};
{% else %}
qbe.Data = null;
{% endif %}
qbe.Containers = [];
(function($) {
    $(document).ready(function() {
        var rows = "#qbeConditionsTable tbody tr";

        $("#qbeTabularTab").click(function() {
            selectTab("Tabular");
            return false;
        });

        $("#qbeDiagramTab").click(function() {
            selectTab("Diagram");
            $(window).resize();
            qbe.Diagram.repaintAll();
            return false;
        });
        $("#qbeModelsTab").click(function() {
            // #qbeConnectorList,
            $("#changelist-filter").toggle();
            if ($(".qbeContainer").css("width") == "85%") {
                $(".qbeContainer").css("width", "100%");
            } else {
                $(".qbeContainer").css("width", "85%");
            }
        });
        function selectTab(tab) {
            $("#qbeTabular").hide();
            $("#qbeDiagram").hide();
            $("#qbe"+ tab).show();
        }

        $('#qbeForm tbody tr').formset({
          prefix: '{{ formset.prefix }}',
          addText: '{% trans "Add another" %}',
          addCssClass: "add-row",
          deleteText: '{% trans "Remove" %}',
          deleteCssClass: "inline-deletelink",
          formCssClass: "dynamic-{{ formset.prefix }}",
          emptyCssClass: "add-row",
          removed: qbe.Core.alternatingRows,
          added: qbe.Core.updateRow
        });
        // Workaround in order to get the class "add-row" in the right row
        $(rows +":last").addClass("add-row");

        $("a.qbeModelAnchor").click(qbe.Core.toggleModel);
        $("input:submit[name=_save]").click(function(evt){
            errorString = "";
            
            var checked = ($("input[type=checkbox][name$=-show]:checked").length != 0);
            if (!checked) {
                errorString += "<li>{% trans "Select at least one field to show" %}</li>";
            } else {
                for (var i =0;i < $('input[type=checkbox][name$=-show]:checked').length; i++) {
                    id = "#" + $($('input[type=checkbox][name$=-show]:checked')[i]).attr('id');
                    index = $($('input[type=checkbox][name$=-show]:checked')[i]).parents('tr').index() + 1;
                    modelField = id.replace('-show','-model');
                    fieldField = id.replace('-show','-field');
                    aliasField = id.replace('-show','-alias');
                    groupField = id.replace('-show','-group_by');
                    criteriaField = id.replace('-show','-criteria_0')
                    enterIf = false;

                    if(!$(modelField).val() && $(fieldField).val()) {
                        enterIf = true;
                        errorString += '<li>{% trans "Line" %} ' + index + ': ';
                        errorString += '{% trans "You must select a model to show" %}</li>';
                    }
                    if($(modelField).val() && !$(fieldField).val()) {
                        enterIf = true;
                        errorString += '<li>{% trans "Line" %} ' + index + ': ';
                        errorString += '{% trans "You must select a field from this model to show"%}</li>';
                    }

                    if(!$(modelField).val() && !$(fieldField).val()) {
                        enterIf = true;
                        errorString += '<li>{% trans "Line" %} ' + index + ': ';
                        errorString += '{% trans "You must select a model to show" %}</li>';
                        errorString += '<li>{% trans "Line" %} ' + index + ': ';
                        errorString += '{% trans "You must select a field from this model to show"%}</li>';
                    }

                    if (enterIf === true) {
                        if($(groupField).is(':checked')) {
                            errorString += '<li>{% trans "Line" %} ' + index + ': ';                        
                            errorString += '{% trans "You must select correctly a field to group by this field" %}</li>';
                        }
                        if($(aliasField).val().trim()) {
                            errorString += '<li>{% trans "Line" %} ' + index + ': ';                        
                            errorString += '{% trans "You must select correctly a field to set a alias" %}</li>';                            
                        }
                    } else {
                        if($(criteriaField).val() === "join") {
                            errorString += '<li>{% trans "Line" %} ' + index + ':';
                            errorString += ' {% trans "You cannot show this field" %}</li>';
                        }
                    }
                }
                qbe.Diagram.saveBoxPositions();
            }

            $('select[name$=-criteria_0]').each(function(){
                if($(this).val() === 'join'){
                    id = "#" + $(this).attr('id');
                    groupBySelector = id.replace('-criteria_0','-group_by');
                    showSelector = id.replace('-criteria_0','-show');
                    index = $(this).parents('tr').index()+1;
                    if($(groupBySelector).is(':checked')) {
                        errorString += '<li>{% trans "Line" %} ' + index + ':';
                        errorString +=' {% trans "You cannot group by this field" %}</li>';
                    }
                }
            });

            if(errorString.length) {
                evt.preventDefault();
                finalErrorString = '<p>{% trans "Hello, you have some validation errors" %}:</p><ul>' + errorString + "</ul>";
                $("#ValidationErrors").html(finalErrorString).slideDown('slow');
            }

            removeEmptyLines();
            return checked;
        });

        $('body').delegate('select[name$=-criteria_0]', 'change', function(event) {
            aliasField = "#" + $(this).attr('id').replace('-criteria_0','-alias');
            fieldField = "#" + $(this).attr('id').replace('-criteria_0','-field');
            showField  = "#" + $(this).attr('id').replace('-criteria_0','-show');
            groupField = "#" + $(this).attr('id').replace('-criteria_0','-group_by');
            if($('option:selected', this).val() === 'join'){
                $(aliasField).val("").attr('required',false);
                $(showField + "," + groupField).attr('checked', false);
            }
            else{
                $(criteriaField).val("");
                if($(showField).is(":checked"))
                    $(aliasField).attr('required', true);
            }
        });

        $('body').delegate('select[name$=-field]', 'change', function(event) {
            aliasField = "#" + $(this).attr('id').replace('-field','-alias');
            showField = "#" + $(this).attr('id').replace('-field','-show');
            text = $('option:selected', this).text();
            if($('option:selected', this).val().length && !$('option:selected', this).hasClass('foreign')) {
                $(aliasField).val(text).attr('required', true);
                $(showField).attr('checked', true);
            } else {
                $(aliasField).val('').attr('required', false);
                $(showField).attr('checked', false);
            }
        });

        $('input[type=checkbox][name$=-show]').change(function(event) {
            aliasId = "#" + $(this).attr('id').replace('-show','-alias');
            fieldId = "#" + $(this).attr('id').replace('-show','-field');
            required = ($(this).is(":checked")) ? true : false;
            text = ($(this).is(":checked")) ? $('option:selected', fieldId).text() : "";
            $(aliasId).attr('required', required).val(text);
        });

        $("#ValidationErrors").click(function() {
            $(this).slideUp('slow');
        });
        
        $("#autocomplete").click(function() {
            var models = [];
            $(".qbeFillModels :selected").each(function() {
                var key = $(this).val();
                if (models.indexOf(key) == -1) {
                    models.push(key);
                }
            });
            $.ajax({
                url: "{% url "django_qbe.views.qbe_autocomplete" %}",
                dataType: 'json',
                data: "models="+ models.join(","),
                type: 'post',
                success: showAutocompletionOptions
            });
        });

        function removeEmptyLines() {
            $('#qbeConditionsTable tbody tr').each(function(){
                inputSelector = $('input,select', this).not('select[name$=-sort]');
                if (inputSelector.length) {
                    emptiness = 0;
                    inputSelector.each(function(index, el) {
                        switch($(this).attr('tagName').toUpperCase()){
                            case "INPUT":
                                type = $(this).attr('type').toUpperCase();
                                if(type === "CHECKBOX")
                                    emptiness += ($(this).is(":checked")) ? 1 : 0;
                                else
                                    emptiness += ($(this).val().trim().length) ? 1 : 0;
                                break;
                            case "SELECT":
                                emptiness += ($(this).val()) ? 1 : 0;
                                break;
                        }
                    });
                    if(!emptiness && $(this).index() != 0 ){
                        $('a.inline-deletelink', this).click();
                    }
                }
            });
        }

        function showAutocompletionOptions(data) {
            if (!data) {
                return false;
            }
            var select = $("#autocompletionOptions");
            var options = ['<option disabled="disabled" value="">{% trans "With one of those sets" %}</option>'];
            for(i=0; i<data.length; i++) {
                var key = data[i].join("-");
                var value = data[i].join(", ");
                options.push('<option value="'+ key +'">'+ value +'</option>');
            }
            select.html(options.join(""));
            select.show();
            select.change(function() {
                qbe.Core.addRelationsFrom(select.val());
            });
        };

        $('body').delegate('.qbeFillModels', 'change', qbe.Core.fillModelsEvent);
        $('body').delegate('.qbeFillFields','change', qbe.Core.fillFieldsEvent);

        function initialize() {
            if (qbe.Data) {
                qbe.Core.loadData(qbe.Data);
            }
            $(window).resize();
        };
        initialize();
    });
})(jQuery.noConflict());

/*************************************************
 * Copyright (c) 2015 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

    /**
 * @ngdoc function
 * @name helpers.function:Survey
 * @description
 *  Schedules Helper
 *
 *  Display the scheduler widget in a dialog
 *
 */

import listGenerator from '../shared/list-generator/main';

export default
angular.module('SurveyHelper', [ 'Utilities', 'RestServices', 'SchedulesHelper', 'SearchHelper', 'PaginationHelpers', listGenerator.name, 'ModalDialog' ,
    'GeneratorHelpers', 'sanitizeFilter'])

    .factory('ShowSurveyModal', ['Wait', 'CreateDialog', 'Empty', '$compile' ,
        function(Wait, CreateDialog, Empty, $compile) {
        return function(params) {
            // Set modal dimensions based on viewport width

            var scope = params.scope,
                callback = params.callback,
                mode = (params.mode) ? params.mode : "survey-maker",
                title = params.title,
                element,
                target = (mode==='survey-taker') ? 'password-modal' : "survey-modal-dialog",
                buttons = [{
                "label": "Cancel",
                "onClick": function() {
                    scope.cancelSurvey(this);
                },
                "icon": "fa-times",
                "class": "btn btn-default",
                "id": "survey-close-button"
            },{
                "label": (mode==='survey-taker') ? "Launch" : "Save" ,
                "onClick": function() {
                    setTimeout(function(){
                        scope.$apply(function(){
                            if(mode==='survey-taker'){
                                scope.$emit('SurveyTakerCompleted');
                            } else{
                                scope.saveSurvey();
                            }
                        });
                    });
                },
                "icon":  (mode==='survey-taker') ? "fa-rocket" : "fa-check",
                "class": "btn btn-primary",
                "id": "survey-save-button"
            }];

            CreateDialog({
                id: target,
                title: title,
                scope: scope,
                buttons: buttons,
                width: 700,
                height: 725,
                minWidth: 400,
                onClose: function() {
                    $('#'+target).empty();
                },
                onOpen: function() {
                    Wait('stop');
                    if(mode!=="survey-taker"){
                        // if(scope.mode === 'add'){
                        //     $('#survey-save-button').attr('disabled' , true);
                        // } else
                        if(scope.can_edit === false){
                            $('#survey-save-button').attr('disabled', "disabled");
                        }
                        else {
                            $('#survey-save-button').attr('ng-disabled', "survey_questions.length<1 ");
                        }
                        element = angular.element(document.getElementById('survey-save-button'));
                        $compile(element)(scope);

                    }
                    if(mode==="survey-taker"){
                        $('#survey-save-button').attr('ng-disabled',  "survey_taker_form.$invalid");
                        element = angular.element(document.getElementById('survey-save-button'));
                        $compile(element)(scope);

                    }

                },
                callback: callback
            });
        };
    }])

    .factory('EditSurvey', ['$routeParams','SchedulerInit', 'ShowSurveyModal', 'Wait', 'Rest', 'ProcessErrors', 'GetBasePath', 'GenerateForm',
            'Empty', 'AddSurvey',
    function($routeParams, SchedulerInit, ShowSurveyModal, Wait, Rest, ProcessErrors, GetBasePath, GenerateForm,
        Empty, AddSurvey) {
        return function(params) {
            var scope = params.scope,
                id = params.id,
                tempSurv = {},
                url = GetBasePath('job_templates') + id + '/survey_spec/', i;

            if (scope.removeDialogReady) {
                scope.removeDialogReady();
            }
            scope.removeDialogReady = scope.$on('DialogReady', function() {
                $('#survey-modal-dialog').dialog('open');
            });

            scope.resetForm();
            Wait('start');
            //for adding a job template:
            if(scope.mode === 'add'){
                tempSurv.survey_name = scope.survey_name;
                tempSurv.survey_description = scope.survey_description;
                tempSurv.survey_questions = scope.survey_questions;

                ShowSurveyModal({ title: "Edit Survey", scope: scope, callback: 'DialogReady' });

                // scope.survey_name = tempSurv.survey_name;
                // scope.survey_description = tempSurv.survey_description;

                for(i=0; i<tempSurv.survey_questions.length; i++){
                    scope.finalizeQuestion(tempSurv.survey_questions[i], i);
                }
            }
            //editing an existing job template:
            else{
                // Get the existing record
                Rest.setUrl(url);
                Rest.get()
                    .success(function (data) {
                            if(!Empty(data)){
                                ShowSurveyModal({ title: "Edit Survey", scope: scope, callback: 'DialogReady' });

                                scope.survey_name = data.name;
                                scope.survey_description = data.description;
                                scope.survey_questions = data.spec;
                                for(i=0; i<scope.survey_questions.length; i++){
                                    scope.finalizeQuestion(scope.survey_questions[i], i);
                                }
                                // scope.addQuestion();
                                Wait('stop');
                            } else {
                                AddSurvey({
                                    scope: scope
                                });
                            }

                        })
                    .error(function (data, status) {
                        ProcessErrors(scope, data, status, null,  { hdr: 'Error!',
                            msg: 'Failed to retrieve survey. GET returned status: ' + status });
                    });

            }
        };
    }])

    .factory('AddSurvey', ['$location', '$routeParams', 'SchedulerInit', 'ShowSurveyModal', 'Wait',
    function($location, $routeParams, SchedulerInit, ShowSurveyModal, Wait) {
        return function(params) {
            var scope = params.scope;
                // callback= params.callback,
                // base = $location.path().replace(/^\//, '').split('/')[0],
                // url =  GetBasePath(base),
                // generator = GenerateForm,
                // form = SurveyQuestionForm;

            if (scope.removeDialogReady) {
                scope.removeDialogReady();
            }
            scope.removeDialogReady = scope.$on('DialogReady', function() {
                $('#survey-modal-dialog').dialog('open');
                scope.addQuestion();
            });
            Wait('start');
            $('#form-container').empty();
            scope.resetForm();
            ShowSurveyModal({ title: "Add Survey", scope: scope, callback: 'DialogReady' });
        };
    }])

    /**
     * Delete a survey. Prompts user to confirm delete
     *
     * DeleteSurvey({
     *     scope:       $scope containing list of survey form fields
     *     id:          id of job template that survey is attached to
     *     callback:    $scope.$emit label to call when delete is completed
     * })
     *
     */
    .factory('DeleteSurvey', ['GetBasePath','Rest', 'Wait', 'ProcessErrors',
    function(GetBasePath, Rest, Wait, ProcessErrors) {
        return function(params) {

            var scope = params.scope,
                id = params.id,
                // callback = params.callback,
                url;


            if (scope.removeSurveyDeleted) {
                scope.removeSurveyDeleted();
            }
            scope.$on('SurveyDeleted', function(){
                scope.survey_name = "";
                scope.survey_description = "";
                scope.survey_questions = [];
                Wait('stop');
                scope.survey_exists = false;
                $('#job_templates_delete_survey_btn').hide();
                $('#job_templates_edit_survey_btn').hide();
                $('#job_templates_create_survey_btn').show();
            });


            Wait('start');

            if(scope.mode==="add"){
                scope.$emit("SurveyDeleted");

            } else {
                url = GetBasePath('job_templates')+ id + '/survey_spec/';

                Rest.setUrl(url);
                Rest.destroy()
                    .success(function () {
                        scope.$emit("SurveyDeleted");

                    })
                    .error(function (data, status) {
                        ProcessErrors(scope, data, status, { hdr: 'Error!',
                            msg: 'Failed to delete survey. DELETE returned status: ' + status });
                    });
            }
        };
    }])

/**
     * Takes a finalized question and displays it on the survey maker page
     *
     * FinalizeQuestion({
     *     scope:       $scope containing list of survey form fields
     *     question: question object that was submitted by the question form
     *     id:          id of job template that survey is attached to
     *     callback:    $scope.$emit label to call when delete is completed
     * })
     *
     */
    .factory('FinalizeQuestion', ['GetBasePath','Rest', 'Wait', 'ProcessErrors', '$compile', 'Empty', '$filter',
    function(GetBasePath, Rest, Wait, ProcessErrors, $compile, Empty, $filter) {
        return function(params) {

            var scope = params.scope,
                question = params.question,
                index = params.index,
                required,
                element,
                choices,
                i,
                checked,
                max,
                min,
                defaultValue,
                answers,
                html = "";

            question.index = index;
            question.question_name = $filter('sanitize')(question.question_name);
            question.question_description = (question.question_description) ? $filter('sanitize')(question.question_description) : undefined;


            if(!$('#question_'+question.index+':eq(0)').is('div')){
                html+='<div id="question_'+question.index+'" class="question_final row"></div>';
                $('#finalized_questions').append(html);
            }

            required = (question.required===true) ? "prepend-asterisk" : "";
            html = '<div class="question_title col-xs-12">';
            html += '<label for="'+question.variable+'"><span class="label-text '+required+'"> '+question.question_name+'</span></label>';
            html += '</div>';

            if(!Empty(question.question_description)){
                html += '<div class="col-xs-12 description"><i>'+question.question_description+'</i></div>\n';
            }

            if(question.type === 'text' ){
                defaultValue = (question.default) ? question.default : "";
                defaultValue = $filter('sanitize')(defaultValue);
                defaultValue = scope.serialize(defaultValue);
                html+='<div class="row">'+
                    '<div class="col-xs-8">'+
                    '<input type="text" placeholder="'+defaultValue+'"  class="form-control ng-pristine ng-invalid-required ng-invalid final" required="" readonly>'+
                    '</div></div>';
            }
            if(question.type === "textarea"){
                defaultValue = (question.default) ? question.default : (question.default_textarea) ? question.default_textarea:  "" ;
                defaultValue =  $filter('sanitize')(defaultValue);
                defaultValue = scope.serialize(defaultValue);
                html+='<div class="row">'+
                    '<div class="col-xs-8 input_area">'+
                    '<textarea class="form-control ng-pristine ng-invalid-required ng-invalid final" required="" rows="3" readonly>'+defaultValue+'</textarea>'+
                    '</div></div>';
            }
            if(question.type === 'multiplechoice' || question.type === "multiselect"){
                choices = question.choices.split(/\n/);
                element = (question.type==="multiselect") ? "checkbox" : 'radio';
                question.default = (question.default) ? question.default : (question.default_multiselect) ? question.default_multiselect : "" ;
                answers = question.default.split(/\n/);
                html += '<div class="input_area">';
                for( i = 0; i<choices.length; i++){
                    checked = (!Empty(question.default) && $.inArray(choices[i], answers) !== -1) ? "checked" : "";
                    choices[i] = $filter('sanitize')(choices[i]);
                    choices[i] = scope.serialize(choices[i]);
                    html+= '<input  type="'+element+'"  class="mc" ng-required="!'+question.variable+'" name="'+question.variable+ ' " id="'+question.variable+'" value=" '+choices[i]+' " '+checked+' disabled>' +
                        '<span>'+choices[i] +'</span><br>' ;
                }
                html += '</div>';
            }

            if(question.type === 'password'){
              defaultValue = (question.default) ? question.default : "";
              defaultValue = $filter('sanitize')(defaultValue);
              defaultValue = scope.serialize(defaultValue);
              html+='<div class="row">'+
                  ' <div class="col-xs-8 input_area input-group">'+
                  '<span class="input-group-btn">'+
                  '<button class="btn btn-default survey-maker-password show_input_button" id="'+question.variable+'_show_input_button" aw-tool-tip="Toggle the display of plaintext." aw-tip-placement="top" ng-click="toggleInput(&quot;#'+question.variable+'&quot;)" data-original-title="" title="">ABC</button>'+
                  '</span>'+
                  '<input id="'+ question.variable +'" type="password" ng-model="default_password" name="'+ question.variable +'" class="form-control ng-pristine ng-valid-api-error ng-invalid" autocomplete="false" readonly>'+
                  '</div>'+
                  '</div>';
            }

            if(question.type === 'integer'){
                min = (!Empty(question.min)) ? question.min : "";
                max = (!Empty(question.max)) ? question.max : "" ;
                defaultValue = (!Empty(question.default)) ? question.default : (!Empty(question.default_int)) ? question.default_int : "" ;
                html+='<div class="row">'+
                    '<div class="col-xs-8 input_area">'+
                    '<input type="number" class="final form-control" name="'+question.variable+'" min="'+min+'" max="'+max+'" value="'+defaultValue+'" readonly>'+
                    '</div></div>';

            }
            if(question.type === "float"){
                min = (!Empty(question.min)) ? question.min : "";
                max = (!Empty(question.max)) ? question.max : "" ;
                defaultValue = (!Empty(question.default)) ? question.default : (!Empty(question.default_float)) ? question.default_float : "" ;
                html+='<div class="row">'+
                    '<div class="col-xs-8 input_area">'+
                    '<input type="number" class="final form-control" name="'+question.variable+'" min="'+min+'" max="'+max+'" value="'+defaultValue+'" readonly>'+
                    '</div></div>';

            }
            html += '<div class="col-xs-12 text-right question_actions">';
            html += '<a id="edit-question_'+question.index+'" data-placement="top" aw-tool-tip="Edit question" data-original-title="" title=""><i class="fa fa-pencil"></i> </a>';
            html += '<a id="delete-question_'+question.index+'" data-placement="top" aw-tool-tip="Delete question" data-original-title="" title=""><i class="fa fa-trash-o"></i> </a>';
            html += '<a id="question-up_'+question.index+'" data-placement="top" aw-tool-tip="Move up" data-original-title="" title=""><i class="fa fa-arrow-up"></i> </a>';
            html += '<a id="question-down_'+question.index+'" data-placement="top" aw-tool-tip="Move down" data-original-title="" title=""><i class="fa fa-arrow-down"></i> </a>';
            html+='</div></div>';

            $('#question_'+question.index).append(html);

            element = angular.element(document.getElementById('question_'+question.index));
            // // element.html(html);
            //element.css('opacity', 0.7);
            $compile(element)(scope);
            // var questionScope = scope.$new;

            $('#add_question_btn').show();
            $('#add_question_btn').removeAttr('disabled');
            $('#add_question_btn').focus();
            $('#survey_maker_save_btn').removeAttr('disabled');

            // Sometimes the $event.target returns the anchor element that wraps the icon, and sometimes the icon itself
            // is returned. So for each icon click event we check to see which target the user clicked, and depending no which one
            // they clicked, we move up the dom hierarchy to get the index on the question. Ultimatley the object that is passed to
            // each one of these functions should be the index of the question that the user is trying to perform an action on.
            $('#delete-question_'+question.index+'').on('click', function($event){
                if($event.target.nodeName==="A"){
                    scope.deleteQuestion($event.target.parentElement.parentElement.id.split('_')[1]);
                }
                else if($event.target.nodeName === "I"){
                    scope.deleteQuestion($event.target.parentElement.parentElement.parentElement.id.split('_')[1]);
                }
            });
            $('#edit-question_'+question.index+'').on('click', function($event){
                if($event.target.nodeName==="A"){
                    scope.editQuestion($event.target.parentElement.parentElement.id.split('_')[1]);
                }
                else if($event.target.nodeName === "I"){
                    scope.editQuestion($event.target.parentElement.parentElement.parentElement.id.split('_')[1]);
                }
            });
            $('#question-up_'+question.index+'').on('click', function($event){
                if($event.target.nodeName==="A"){
                    scope.questionUp($event.target.parentElement.parentElement.id.split('_')[1]);
                }
                else if($event.target.nodeName === "I"){
                    scope.questionUp($event.target.parentElement.parentElement.parentElement.id.split('_')[1]);
                }
            });
            $('#question-down_'+question.index+'').on('click', function($event){
                if($event.target.nodeName==="A"){
                    scope.questionDown($event.target.parentElement.parentElement.id.split('_')[1]);
                }
                else if($event.target.nodeName === "I"){
                    scope.questionDown($event.target.parentElement.parentElement.parentElement.id.split('_')[1]);
                }

            });
        };
    }])


     .factory('EditQuestion', ['GetBasePath','Rest', 'Wait', 'ProcessErrors', '$compile', 'GenerateForm', 'SurveyQuestionForm',
    function(GetBasePath, Rest, Wait, ProcessErrors, $compile, GenerateForm, SurveyQuestionForm) {
        return function(params) {

            var scope = params.scope,
                index = params.index,
                element,
                tmpVar,
                i,
                question = params.question, //scope.survey_questions[index],
                form = SurveyQuestionForm;

            $('#survey-save-button').attr('disabled', 'disabled');
            angular.element('#survey_question_question_cancel_btn').trigger('click');
            $('#add_question_btn').hide();
            // $('#new_question .aw-form-well').remove();
            element = $('.question_final:eq('+index+')');
            element.css('opacity', 1.0);
            element.empty();
            scope.text_min = null;
            scope.text_max = null;
            scope.int_min = null;
            scope.int_max = null;
            scope.float_min = null;
            scope.float_max = null;
            scope.password_min = null;
            scope.password_max = null;
            scope.pwcheckbox = false;

            if (scope.removeFillQuestionForm) {
                scope.removeFillQuestionForm();
            }
            scope.removeFillQuestionForm = scope.$on('FillQuestionForm', function() {
                for( var fld in form.fields){
                    scope[fld] = question[fld];
                    if(form.fields[fld].type === 'select'){
                        for (i = 0; i < scope.answer_types.length; i++) {
                            if (question[fld] === scope.answer_types[i].type) {
                                scope[fld] = scope.answer_types[i];
                            }
                        }
                    }
                }
                if( question.type === 'text'){
                    scope.text_min = question.min;
                    scope.text_max = question.max;
                    scope.default_text = question.default;
                }
                if( question.type === 'textarea'){
                    scope.textarea_min = question.min;
                    scope.textarea_max = question.max;
                    scope.default_textarea= question.default;
                }
                if(question.type === 'password'){
                    scope.password_min = question.min;
                    scope.password_max = question.max;
                    scope.default_password = question.default;
                }
                if( question.type === 'integer'){
                    scope.int_min = question.min;
                    scope.int_max = question.max;
                    scope.default_int = question.default;
                }
                else if( question.type  === 'float'  ) {
                    scope.float_min = question.min;
                    scope.float_max = question.max;
                    scope.default_float = question.default;

                }
                else if ( question.type === 'multiselect'){
                    scope.default_multiselect = question.default;
                }
            });

            if (scope.removeGenerateForm) {
                scope.removeGenerateForm();
            }
            scope.removeGenerateForm = scope.$on('GenerateForm', function() {
                tmpVar = scope.mode;
                GenerateForm.inject(form, { id: 'question_'+index, mode: 'edit' , related: false, scope:scope, breadCrumbs: false});
                scope.mode = tmpVar;
                scope.$emit('FillQuestionForm');
            });


            scope.$emit('GenerateForm');

        };
    }])

    .factory('SurveyControllerInit', ['$location', 'DeleteSurvey', 'EditSurvey', 'AddSurvey', 'GenerateForm', 'SurveyQuestionForm', 'Wait', 'Alert',
            'GetBasePath', 'Rest', 'ProcessErrors' , '$compile', 'FinalizeQuestion', 'EditQuestion', '$sce',
        function($location, DeleteSurvey, EditSurvey, AddSurvey, GenerateForm, SurveyQuestionForm, Wait, Alert,
            GetBasePath, Rest, ProcessErrors, $compile, FinalizeQuestion, EditQuestion, $sce) {
        return function(params) {
            var scope = params.scope,
                id = params.id,
                i, url, html, element,
                questions = [],
                form = SurveyQuestionForm,
                sce = params.sce;
            scope.sce = sce;
            scope.survey_questions = [];
            scope.answer_types=[
                {name: 'Text' , type: 'text'},
                {name: 'Textarea', type: 'textarea'},
                {name: 'Password', type: 'password'},
                {name: 'Multiple Choice (single select)', type: 'multiplechoice'},
                {name: 'Multiple Choice (multiple select)', type: 'multiselect'},
                {name: 'Integer', type: 'integer'},
                {name: 'Float', type: 'float'}
            ];

            scope.serialize = function(expression){
                return $sce.getTrustedHtml(expression);
            };

            scope.deleteSurvey = function() {
                DeleteSurvey({
                    scope: scope,
                    id: id,
                    // callback: 'SchedulesRefresh'
                });
            };

            scope.editSurvey = function() {
                if(scope.mode==='add'){
                    for(i=0; i<scope.survey_questions.length; i++){
                        questions.push(scope.survey_questions[i]);
                    }
                }
                EditSurvey({
                    scope: scope,
                    id: id,
                    // callback: 'SchedulesRefresh'
                });
            };

            scope.addSurvey = function() {
                AddSurvey({
                    scope: scope
                });
            };

            scope.cancelSurvey = function(me){
                if(scope.mode === 'add'){
                    questions = [];
                }
                else {
                    scope.survey_questions = [];
                }
                $(me).dialog('close');
            };

            scope.addQuestion = function(){
                var tmpMode = scope.mode;
                GenerateForm.inject(form, { id:'new_question', mode: 'add' , scope: scope, related: false, breadCrumbs: false});
                scope.mode = tmpMode;
                scope.required = true; //set the required checkbox to true via the ngmodel attached to scope.required.
                scope.text_min = null;
                scope.text_max = null;
                scope.int_min = null;
                scope.int_max = null;
                scope.float_min = null;
                scope.float_max = null;
                scope.duplicate = false;
                scope.invalidChoice = false;
                scope.minTextError = false;
                scope.maxTextError = false;
            };

            scope.addNewQuestion = function(){
                // $('#add_question_btn').on("click" , function(){
                scope.addQuestion();
                $('#survey_question_question_name').focus();
                $('#add_question_btn').attr('disabled', 'disabled');
                $('#add_question_btn').hide();
                $('#survey-save-button').attr('disabled' , 'disabled');
            // });
            };
            scope.editQuestion = function(index){
                scope.duplicate = false;
                EditQuestion({
                    index: index,
                    scope: scope,
                    question: (scope.mode==='add') ? questions[index] : scope.survey_questions[index]
                });
            };

            scope.deleteQuestion = function(index){
                element = $('.question_final:eq('+index+')');
                element.remove();
                if(scope.mode === 'add'){
                    questions.splice(index, 1);
                    scope.reorder();
                    if(questions.length<1){
                        $('#survey-save-button').attr('disabled', 'disabled');
                    }
                }
                else {
                    scope.survey_questions.splice(index, 1);
                    scope.reorder();
                    if(scope.survey_questions.length<1){
                        $('#survey-save-button').attr('disabled', 'disabled');
                    }
                }
            };

            scope.cancelQuestion = function(event){
                var elementID, key;
                if(event.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.id==="new_question"){
                    $('#new_question .aw-form-well').remove();
                    $('#add_question_btn').show();
                    $('#add_question_btn').removeAttr('disabled');
                    if(scope.mode === 'add' && questions.length>0){
                        $('#survey-save-button').removeAttr('disabled');
                    }
                    if(scope.mode === 'edit' && scope.survey_questions.length>0 && scope.can_edit===true){
                        $('#survey-save-button').removeAttr('disabled');
                    }

                } else {
                    elementID = event.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.id;
                    key = elementID.split('_')[1];
                    $('#'+elementID).empty();
                    if(scope.mode === 'add'){
                        if(questions.length>0){
                            $('#survey-save-button').removeAttr('disabled');
                        }
                        scope.finalizeQuestion(questions[key], key);
                    }
                    else if(scope.mode=== 'edit' ){
                        if(scope.survey_questions.length>0 && scope.can_edit === true){
                            $('#survey-save-button').removeAttr('disabled');
                        }
                        scope.finalizeQuestion(scope.survey_questions[key] , key);
                    }
                }
            };

            scope.questionUp = function(index){
                var animating = false,
                    clickedDiv = $('#question_'+index),
                    prevDiv = clickedDiv.prev(),
                    distance = clickedDiv.outerHeight();

                if (animating) {
                    return;
                }

                if (prevDiv.length) {
                    animating = true;
                    $.when(clickedDiv.animate({
                        top: -distance
                    }, 600),
                    prevDiv.animate({
                        top: distance
                    }, 600)).done(function () {
                        prevDiv.css('top', '0px');
                        clickedDiv.css('top', '0px');
                        clickedDiv.insertBefore(prevDiv);
                        animating = false;
                        if ( scope.mode === 'add'){
                            i = questions[index];
                            questions[index] = questions[index-1];
                            questions[index-1] = i;
                        } else {
                            i = scope.survey_questions[index];
                            scope.survey_questions[index] = scope.survey_questions[index-1];
                            scope.survey_questions[index-1] = i;
                        }
                        scope.reorder();
                    });
                }
            };

            scope.questionDown = function(index){
                var clickedDiv = $('#question_'+index),
                    nextDiv = clickedDiv.next(),
                    distance = clickedDiv.outerHeight(),
                    animating = false;

                if (animating) {
                    return;
                }

                if (nextDiv.length) {
                    animating = true;
                    $.when(clickedDiv.animate({
                        top: distance
                    }, 600),
                    nextDiv.animate({
                        top: -distance
                    }, 600)).done(function () {
                        nextDiv.css('top', '0px');
                        clickedDiv.css('top', '0px');
                        nextDiv.insertBefore(clickedDiv);
                        animating = false;
                        if(scope.mode === 'add'){
                            i = questions[index];
                            questions[index] = questions[Number(index)+1];
                            questions[Number(index)+1] = i;
                        } else {
                            i = scope.survey_questions[index];
                            scope.survey_questions[index] = scope.survey_questions[Number(index)+1];
                            scope.survey_questions[Number(index)+1] = i;
                        }
                        scope.reorder();
                    });
                }
            };

            scope.reorder = function(){
                if(scope.mode==='add'){
                    for(i=0; i<questions.length; i++){
                        questions[i].index=i;
                        $('.question_final:eq('+i+')').attr('id', 'question_'+i);
                    }
                }
                else {
                    for(i=0; i<scope.survey_questions.length; i++){
                        scope.survey_questions[i].index=i;
                        $('.question_final:eq('+i+')').attr('id', 'question_'+i);
                    }
                }
            };

            scope.finalizeQuestion= function(data, index){
                FinalizeQuestion({
                    scope: scope,
                    question: data,
                    id: id,
                    index: index
                });
            };

            scope.typeChange = function() {
                scope.minTextError = false;
                scope.maxTextError = false;
                scope.default = "";
                scope.default_multiselect = "";
                scope.default_float = "";
                scope.default_int = "";
                scope.default_textarea = "";
                scope.default_password = "" ;
                scope.choices = "";
                scope.text_min = "";
                scope.text_max = "" ;
                scope.textarea_min = "";
                scope.textarea_max = "" ;
                scope.password_min = "" ;
                scope.password_max = "" ;
                scope.int_min = "";
                scope.int_max = "";
                scope.float_min = "";
                scope.float_max = "";
                scope.survey_question_form.default.$setPristine();
                scope.survey_question_form.default_multiselect.$setPristine();
                scope.survey_question_form.default_float.$setPristine();
                scope.survey_question_form.default_int.$setPristine();
                scope.survey_question_form.default_textarea.$setPristine();
                scope.survey_question_form.default_password.$setPristine();
                scope.survey_question_form.choices.$setPristine();
                scope.survey_question_form.int_min.$setPristine();
                scope.survey_question_form.int_max.$setPristine();
            };

            scope.submitQuestion = function(event){
                var data = {},
                fld, i,
                choiceArray,
                answerArray,
                key, elementID;
                scope.invalidChoice = false;
                scope.duplicate = false;
                scope.minTextError = false;
                scope.maxTextError = false;

                if(scope.type.type==="text"){
                    if(scope.default.trim() !== ""){
                        if(scope.default.trim().length < scope.text_min && scope.text_min !== "" ){
                            scope.minTextError = true;
                        }
                        if(scope.text_max <  scope.default.trim().length && scope.text_max !== "" ){
                            scope.maxTextError = true;
                        }
                    }
                }

                if(scope.type.type==="textarea"){
                    if(scope.default_textarea.trim() !== ""){
                        if(scope.default_textarea.trim().length < scope.textarea_min && scope.textarea_min !== "" ){
                            scope.minTextError = true;
                        }
                        if(scope.textarea_max <  scope.default_textarea.trim().length && scope.textarea_max !== "" ){
                            scope.maxTextError = true;
                        }
                    }
                }

                if(scope.type.type==="password"){
                    if(scope.default_password.trim() !== ""){
                        if(scope.default_password.trim().length < scope.password_min && scope.password_min !== "" ){
                            scope.minTextError = true;
                        }
                        if(scope.password_max <  scope.default_password.trim().length && scope.password_max !== "" ){
                            scope.maxTextError = true;
                        }
                    }
                }

                if(scope.type.type==="multiselect" && scope.default_multiselect.trim() !== ""){
                    choiceArray = scope.choices.split(/\n/);
                    answerArray = scope.default_multiselect.split(/\n/);

                    if(answerArray.length>0){
                        for(i=0; i<answerArray.length; i++){
                            if($.inArray(answerArray[i], choiceArray)===-1){
                                scope.invalidChoice = true;
                            }
                        }
                    }
                }

                if(scope.type.type==="multiplechoice" && scope.default.trim() !== ""){
                    choiceArray = scope.choices.split(/\n/);
                    if($.inArray(scope.default, choiceArray)===-1){
                        scope.invalidChoice = true;
                    }
                }

                // validate that there aren't any questions using this var name.
                if(GenerateForm.mode === 'add'){
                    if(scope.mode === 'add'){
                        for(fld in questions){
                            if(questions[fld].variable === scope.variable){
                                scope.duplicate = true;
                            }
                        }
                    }
                    else if (scope.mode === 'edit'){
                        for(fld in scope.survey_questions){
                            if(scope.survey_questions[fld].variable === scope.variable){
                                scope.duplicate = true;
                            }
                        }
                    }
                }
                if(GenerateForm.mode === 'edit'){
                    elementID = event.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.id;
                    key = elementID.split('_')[1];
                    if(scope.mode==='add'){
                        for(fld in questions){
                            if(questions[fld].variable === scope.variable && fld!==key){
                                scope.duplicate = true;
                            }
                        }
                    }
                    else if(scope.mode === 'edit'){
                        for(fld in scope.survey_questions){
                            if(scope.survey_questions[fld].variable === scope.variable && fld!==key){
                                scope.duplicate = true;
                            }
                        }
                    }

                }

                if(scope.duplicate===true || scope.invalidChoice===true || scope.minTextError === true || scope.maxTextError === true){
                    return;
                }

                try {
                    //create data object for each submitted question
                    data.question_name = scope.question_name;
                    data.question_description = (scope.question_description) ? scope.question_description : "" ;
                    data.required = scope.required;
                    data.type = scope.type.type;
                    data.variable = scope.variable;

                    //set the data.min depending on which type of question
                    if (scope.type.type === 'text') {
                        data.min = scope.text_min;
                    } else if (scope.type.type === 'textarea') {
                        data.min = scope.textarea_min;
                    } else if (scope.type.type === 'password') {
                        data.min = scope.password_min;
                    } else if (scope.type.type === 'float') {
                        data.min = scope.float_min;
                    } else if (scope.type.type === 'integer') {
                        data.min = scope.int_min;
                    } else {
                        data.min = "";
                    }
                    // set hte data max depending on which type
                    if (scope.type.type === 'text') {
                        data.max = scope.text_max;
                    } else if (scope.type.type === 'textarea') {
                        data.max = scope.textarea_max;
                    } else if (scope.type.type === 'password') {
                        data.max = scope.password_max;
                    } else if (scope.type.type === 'float') {
                        data.max = scope.float_max;
                    } else if (scope.type.type === 'integer') {
                        data.max = scope.int_max;
                    } else {
                        data.max = "";
                    }

                    //set the data.default depending on which type
                    if (scope.type.type === 'text' || scope.type.type === 'multiplechoice') {
                        data.default = scope.default;
                    } else if (scope.type.type === 'textarea') {
                        data.default = scope.default_textarea;
                    } else if (scope.type.type === 'password') {
                        data.default = scope.default_password;
                    } else if (scope.type.type === 'multiselect') {
                          data.default = scope.default_multiselect;
                    } else if (scope.type.type === 'float') {
                        data.default = scope.default_float;
                    } else if (scope.type.type === 'integer') {
                        data.default = scope.default_int;
                    } else {
                        data.default = "";
                    }
                    data.choices = (scope.type.type === "multiplechoice") ? scope.choices : (scope.type.type === 'multiselect') ? scope.choices : "" ;

                    Wait('stop');
                    if(scope.mode === 'add' || scope.mode==="edit" && scope.can_edit === true){
                        $('#survey-save-button').removeAttr('disabled');
                    }

                    if(GenerateForm.mode === 'add'){
                        if(scope.mode === 'add'){
                            questions.push(data);
                            $('#new_question .aw-form-well').remove();
                            $('#add_question_btn').show();
                            scope.finalizeQuestion(data , questions.length-1);
                        }
                        else if (scope.mode === 'edit'){
                            scope.survey_questions.push(data);
                            $('#new_question .aw-form-well').remove();
                            $('#add_question_btn').show();
                            scope.finalizeQuestion(data , scope.survey_questions.length-1);
                        }

                    }
                    if(GenerateForm.mode === 'edit'){
                        elementID = event.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.id;
                        key = elementID.split('_')[1];
                        if(scope.mode==='add'){
                            questions[key] = data;
                        }
                        else if(scope.mode === 'edit'){
                            scope.survey_questions[key] = data;
                        }
                        $('#'+elementID).empty();
                        scope.finalizeQuestion(data , key);
                    }



                } catch (err) {
                    Wait('stop');
                    Alert("Error", "Error parsing extra variables. Parser returned: " + err);
                }
            };
            scope.resetForm = function(){
                html = '<div class="row">'+
                        '<div class="col-sm-12">'+
                        '<label for="survey"><span class="label-text prepend-asterisk"> Questions</span></label>'+
                        '<div id="survey_maker_question_area"></div>'+
                        '<div id="finalized_questions"></div>'+
                        '<button style="display:none" type="button" class="btn btn-sm btn-primary" id="add_question_btn" ng-click="addNewQuestion()" aw-tool-tip="Create a new question" data-placement="top" data-original-title="" title="" disabled><i class="fa fa-plus fa-lg"></i>  New Question</button>'+
                        '<div id="new_question"></div>'+
                    '</div>'+
                '</div>';
                $('#survey-modal-dialog').html(html);
                element = angular.element(document.getElementById('add_question_btn'));
                $compile(element)(scope);
            };

            scope.saveSurvey = function() {
                Wait('start');
                if(scope.mode ==="add"){
                    $('#survey-modal-dialog').dialog('close');
                    if(questions.length>0){
                        scope.survey_questions = questions;
                    }
                    scope.survey_name = "";
                    scope.survey_description = "";
                    questions = [] ;
                    scope.$emit('SurveySaved');
                }
                else{
                    scope.survey_name = "";
                    scope.survey_description = "";
                    url = GetBasePath('job_templates') + id + '/survey_spec/';
                    Rest.setUrl(url);
                    Rest.post({ name: scope.survey_name, description: scope.survey_description, spec: scope.survey_questions })
                        .success(function () {
                            // Wait('stop');
                            $('#survey-modal-dialog').dialog('close');
                            scope.$emit('SurveySaved');
                        })
                        .error(function (data, status) {
                            ProcessErrors(scope, data, status, null, { hdr: 'Error!',
                                msg: 'Failed to add new survey. POST returned status: ' + status });
                        });
                }
            };

            //for toggling the input on password inputs
            scope.toggleInput = function(id) {
                var buttonId = id + "_show_input_button",
                    inputId = id,
                    buttonInnerHTML = $(buttonId).html();
                if (buttonInnerHTML.indexOf("Show") > -1) {
                    $(buttonId).html("Hide");
                    $(inputId).attr("type", "text");
                } else {
                    $(buttonId).html("Show");
                    $(inputId).attr("type", "password");
                }
            };

        };
    }]);
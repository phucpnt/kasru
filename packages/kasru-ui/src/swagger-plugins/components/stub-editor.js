import React from "react"
import PropTypes from "prop-types"
import AceEditor from "react-ace"

import isUndefined from "lodash/isUndefined"
import omit from "lodash/omit"
import isEqual from "lodash/isEqual"
import isEmpty from "lodash/isEmpty"
import debounce from "lodash/debounce"

import ace from "brace"
import "brace/mode/json"
import "brace/theme/tomorrow_night_eighties"
import "brace/ext/language_tools"
import "brace/ext/searchbox"

const NOOP = Function.prototype // Apparently the best way to no-op


export default function makeEditor({ editorPluginsToRun }) {

  class Editor extends React.Component {

    constructor(props, context) {
      super(props, context)

      this.editor = null
      this.json = !isUndefined(props.value) ? [props.value] : []
      this.debouncedOnChange = debounce(this.onChange, props.debounce)
    }

    static propTypes = {
      specId: PropTypes.string,
      value: PropTypes.string,
      editorOptions: PropTypes.object,
      debounce: PropTypes.number,

      onChange: PropTypes.func,
      onMarkerLineUpdate: PropTypes.func,

      markers: PropTypes.object,
      goToLine: PropTypes.object,
    }

    static defaultProps = {
      value: "",
      specId: "--unknown--",
      onChange: NOOP,
      onMarkerLineUpdate: NOOP,
      markers: {},
      goToLine: {},
      editorOptions: {},
      debounce: 800 // 0.5 imperial seconds™

    }


    // This should be debounced, not only to prevent too many re-renders, but to also capture the this.yaml value, at the same time we'll call the upstream onChange
    onChange = (value) => {
      // Send it upstream ( this.silent is taken from react-ace module). It avoids firing onChange, when we update setValue
      this.json = this.json.slice(0,2) // Keep it small
      this.json.unshift(value) // Add this yaml onto a stack (in reverse ), so we can see if upstream sends us back something we just sent it!
      this.props.onChange(value)
    }

    checkForSilentOnChange = (value) => {
      if(!this.silent) {
        this.debouncedOnChange(value)
      }
    }

    onLoad = (editor) => {
      const { props } = this

      const langTools = ace.acequire("ace/ext/language_tools")
      const session = editor.getSession()

      this.editor = editor

      // fixes a warning, see https://github.com/ajaxorg/ace/issues/2499
      editor.$blockScrolling = Infinity

      session.setUseWrapMode(true)
      session.on("changeScrollLeft", xPos => { // eslint-disable-line no-unused-vars
        session.setScrollLeft(0)
      })


      editor.setHighlightActiveLine(false)
      editor.setHighlightActiveLine(true)
      this.syncOptionsFromState(this.props.editorOptions)
    }

    onResize = () => {
      const { editor } = this
      if(editor) {
        let session = editor.getSession()
        editor.resize()
        let wrapLimit = session.getWrapLimit()
        editor.setPrintMarginColumn(wrapLimit)
      }
    }

    onClick = () => {
      // onClick is deferred by 40ms, to give element resizes time to settle.
      setTimeout(() => {
        if(this.getWidth() !== this.width) {
          this.onResize()
          this.width = this.getWidth()
        }
      }, 40)
    }

    getWidth = () => {
      let el = document.getElementById("editor-wrapper")
      return el ? el.getBoundingClientRect().width : null
    }

    updateJSON = () => {
      if(this.editor.getValue() === this.json[0]) {
        // editor is already aware of latest changes, so do nothing
        return
      }

      // this.silent is taken from react-ace module. It avoids firing onChange, when we update setValue
      this.silent = true
      const pos = this.editor.session.selection.toJSON()
      this.editor.setValue(this.json[0]) // The first element is the most recent
      this.editor.session.selection.fromJSON(pos)
      this.silent = false
    }

    syncOptionsFromState = (editorOptions) => {
      const { editor } = this
      if(!editor) {
        return
      }

      const setOptions = omit(editorOptions, ["readOnly"])
      editor.setOptions(setOptions)

      const readOnly = isUndefined(editorOptions.readOnly)
            ? false
            : editorOptions.readOnly // If its undefined, default to false.
      editor.setReadOnly(readOnly)
    }

    componentWillMount() {
      // add user agent info to document
      // allows our custom Editor styling for IE10 to take effect
      var doc = document.documentElement
      doc.setAttribute("data-useragent", navigator.userAgent)
      this.syncOptionsFromState(this.props.editorOptions)
    }

    componentDidMount() {
      // eslint-disable-next-line react/no-did-mount-set-state
      this.width = this.getWidth()
      document.addEventListener("click", this.onClick)
      this.updateJSON()

    }

    componentWillUnmount() {
      document.removeEventListener("click", this.onClick)
    }

    componentWillReceiveProps(nextProps) {
      let hasChanged = (k) => !isEqual(nextProps[k], this.props[k])
      let wasEmptyBefore = (k) => nextProps[k] && (!this.props[k] || isEmpty(this.props[k]))
      const editor = this.editor
      const newValue = nextProps.value

      // Change the debounce value/func
      if(this.props.debounce !== nextProps.debounce) {
        this.debouncedOnChange.flush()
        this.debouncedOnChange = debounce(this.onChange, nextProps.debounce)
      }

      //// Mange the yaml lifecycle...
      // If the yaml doesn't match _what we already have in state_ then update the yaml in the editor
      // Taking care to manage the other things in lifecycle
      if(newValue !== this.props.value && !this.json.indexOf(newValue) > -1) {

        // Remove markers
        if(this.removeMarkers) {
          this.removeMarkers()
        }

        this.json = [newValue] // Clear our stack, and add the latest from props
        this.updateJSON()


        // Clear undo-stack if we've changed specId or it was empty before
        if(hasChanged("specId") || wasEmptyBefore("value")) {
          setTimeout(function () {
            editor.getSession().getUndoManager().reset()
          }, 100) // TODO: get rid of timeout
        }
      }

      // If the yaml was in our stack, we should clear it up
      if(this.json.indexOf(newValue) > -1) {
        // remove all previous yaml's ( leave newValue in though ).
        // In case another onChange is still in flight
        this.json = this.json.slice(this.json.indexOf(newValue) + 1)
      }


      if(hasChanged("editorOptions")) {
        this.syncOptionsFromState(nextProps.editorOptions)
      }

      if(editor && nextProps.goToLine && nextProps.goToLine.line && hasChanged("goToLine")) {
        editor.gotoLine(nextProps.goToLine.line)
        nextProps.editorActions.jumpToLine(null)
      }

    }

    shouldComponentUpdate() {
      return false // Never update, see: componentWillRecieveProps and this.updateYaml for where we update things.
      // TODO this might affect changes to the "onLoad", "onChange" props...
    }

    render() {
      // NOTE: we're manually managing the value lifecycle, outside of react render
      // This will only render once.
      return (
        <AceEditor
          mode="json"
          theme="tomorrow_night_eighties"
          onLoad={this.onLoad}
          onChange={this.checkForSilentOnChange}
          name="ace-editor"
          width="100%"
          height="100%"
          tabSize={2}
          fontSize={14}
          useSoftTabs="true"
          wrapEnabled={true}
          editorProps={{
            "display_indent_guides": true,
            folding: "markbeginandend"
          }}
          setOptions={{
            cursorStyle: "smooth",
            wrapBehavioursEnabled: true
          }}
          />
      )
    }

  }

  return Editor
}

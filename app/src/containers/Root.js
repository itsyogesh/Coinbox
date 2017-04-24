import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Switch, Route } from 'react-router-dom'
import { connect } from 'react-redux'
import { checkAuth } from '../actions/auth/token'
import { fetchUser } from '../actions/user'

import Landing from '../components/Landing'
import Dashboard from './Dashboard'
import Signup from '../components/Signup'
import Login from '../components/Login'

class Root extends Component {

  componentDidMount() {
    this.props.checkAuth()
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.isAuthenticated !== this.props.isAuthenticated) {
      this.props.fetchUser()
    }
  }

  render() {
    const isAuthenticated = this.props.isAuthenticated
    return (
      <Switch>
        <Route exact path='/' component={isAuthenticated ? Dashboard : Landing} />
        <Route path='/signup' component={Signup} />
        <Route path='/login' component={Login} />
      </Switch>
    )
  }
}

Root.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  checkAuth: PropTypes.func.isRequired,
  fetchUser: PropTypes.func.isRequired
}

const mapStateToProps = (state) => ({
  isAuthenticated: state.isAuthenticated
})

export default connect(mapStateToProps, { checkAuth, fetchUser })(Root)

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Switch, Route } from 'react-router-dom'
import { connect } from 'react-redux'
import { Container, Segment, Dimmer, Loader } from 'semantic-ui-react'
import { checkAuth } from '../actions/auth/token'
import { fetchUser } from '../actions/user'
import { fetchFiatRateFromIP } from '../actions/rates'

import Landing from '../components/Landing'
import Dashboard from './Dashboard'
import Signup from '../components/Signup'
import Login from '../components/Login'

class Root extends Component {

  componentDidMount() {
    this.props.checkAuth()
    this.props.fetchFiatRateFromIP()
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.user.isAuthenticated !== nextProps.user.isAuthenticated) {
      this.props.checkAuth()
    }
  }

  render() {
    if (this.props.user.isAuthToken && this.props.user.isLoading) {
      return (
        <Container fluid className='loading'>
          <Dimmer active inverted>
            <Loader size='large' />
          </Dimmer>
        </Container>
      )
    }

    else if (!this.props.user.isLoading && this.props.user.isAuthenticated) {
      return (
        <Route path='/' component={Dashboard} />
      )
    }

    else {
      return (
        <Switch>
          <Route exact path='/' component={Landing} />
          <Route path='/signup' component={Signup} />
          <Route path='/login' component={Login} />
        </Switch>
      )
    }
  }
}

Root.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  checkAuth: PropTypes.func.isRequired,
  fetchUser: PropTypes.func.isRequired,
  fetchFiatRateFromIP: PropTypes.func.isRequired
}

const mapStateToProps = (state) => ({
  isAuthenticated: state.user.isAuthenticated,
  user: state.user
})

export default connect(mapStateToProps, { checkAuth, fetchUser, fetchFiatRateFromIP })(Root)

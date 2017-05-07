import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Redirect, Route } from 'react-router-dom'
import { Grid, Container } from 'semantic-ui-react'

import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import DashboardContent from '../components/DashboardContent'
import SendMoney from '../components/SendMoney'
import WalletPage from '../components/WalletPage'

class Dashboard extends Component {
  state = {
    user: this.props.user,
    isAuthenticated: this.props.isAuthenticated
  }

  componentWillReceiveProps(nextProps) {
    this.setState({isAuthenticated: nextProps.isAuthenticated})
  }

  render() {
    if(!this.state.isAuthenticated) return (
      <Redirect to='/' exact />
    )
    return (
      <Container fluid className='dashboard'>
        <Navbar inverted user={this.props.user} />
          <Grid className='dashboard-content'>
            <Grid.Column width={3}>
              <Sidebar />
            </Grid.Column>
            <Grid.Column width={13}>
              <Route exact path='/' component={DashboardContent} />
              <Route path='/dashboard' component={DashboardContent} />
              <Route path='/send' component={SendMoney} />
              <Route path='/wallets' component={WalletPage} />
            </Grid.Column>
          </Grid>
      </Container>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    user: state.user.details,
    isAuthenticated: state.user.isAuthenticated
  }
}

export default connect(mapStateToProps, null)(Dashboard)

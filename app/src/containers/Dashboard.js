import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Container, Header, Grid, Segment } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { Redirect } from 'react-router-dom'

import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import PortfolioCard from '../components/PortfolioCard'
import RecentActivityCard from '../components/RecentActivityCard'

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
      <Redirect to='/' />
    )
    return (
      <Container fluid className='dashboard'>
        <Navbar inverted user={this.props.user} />
          <Grid className='dashboard-content'>
            <Grid.Column width={3}>
              <Sidebar />
            </Grid.Column>
            <Grid.Column width={13}>
              <Segment basic>
                <Grid stackable>
                  <Grid.Row stretched>
                    <Grid.Column width={8}>
                      <PortfolioCard />
                    </Grid.Column>
                    <Grid.Column width={8}>
                      <RecentActivityCard />
                    </Grid.Column>
                  </Grid.Row>
                  <Grid.Row>
                    <Grid.Column width={8}>

                    </Grid.Column>
                    <Grid.Column width={8}>

                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Segment>
            </Grid.Column>
          </Grid>
      </Container>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    user: state.user.details,
    isAuthenticated: state.isAuthenticated
  }
}

export default connect(mapStateToProps, null)(Dashboard)

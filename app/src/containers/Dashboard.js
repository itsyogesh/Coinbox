import React from 'react'
import PropTypes from 'prop-types'
import { Container, Header, Grid, Segment } from 'semantic-ui-react'
import { connect } from 'react-redux'

import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import PortfolioCard from '../components/PortfolioCard'
import RecentActivityCard from '../components/RecentActivityCard'

const Dashboard = (props) => {
  return (
    <Container fluid className='dashboard'>
      <Navbar inverted user={props.user} />
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

const mapStateToProps = (state) => {
  return {
    user: state.user.details
  }
}

export default connect(mapStateToProps, null)(Dashboard)

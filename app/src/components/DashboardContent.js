import React from 'react'
import { Container, Header, Grid, Segment } from 'semantic-ui-react'

import PortfolioCard from '../components/PortfolioCard'
import RecentActivityCard from '../components/RecentActivityCard'

const DashboardContent = () => {
  return (
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
  )
}

export default DashboardContent

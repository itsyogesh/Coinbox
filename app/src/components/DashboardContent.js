import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Container, Header, Grid, Segment } from 'semantic-ui-react'
import { connect } from 'react-redux'

import { fetchAllWallets } from '../actions/wallet'
import Loader from './Loader'
import PortfolioCard from '../components/PortfolioCard'
import RecentActivityCard from '../components/RecentActivityCard'

class DashboardContent extends Component {
  state = {
    isLoading: this.props.wallets.isLoading
  }

  componentDidMount(){
    this.props.fetchAllWallets()
  }

  componentWillReceiveProps(nextProps){
    this.setState({isLoading: nextProps.wallets.isLoading})
  }

  render() {
    if (this.state.isLoading) {
      return (
        <Loader />
      )
    } else {
      return (
        <Segment basic>
          <Grid stackable>
            <Grid.Row stretched>
              <Grid.Column width={8}>
                <PortfolioCard wallets={this.props.wallets}/>
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
  }
}


DashboardContent.propTypes = {
  wallets: PropTypes.object,
  fetchAllWallets: PropTypes.func.isRequired
}

const mapStateToProps = (state) => ({
  wallets: state.wallets
})

export default connect(mapStateToProps, { fetchAllWallets })(DashboardContent)
